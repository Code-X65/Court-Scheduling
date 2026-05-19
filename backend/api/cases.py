

from datetime        import datetime
from fastapi         import APIRouter, Depends, HTTPException
from sqlalchemy.orm  import Session
from typing          import List, Optional

from db.database     import get_db
from db.crud         import (get_all_cases, get_case_by_id, get_case_by_number,
                              create_case, update_case_status, delete_case,
                              get_judge_by_id, get_courtroom_by_id,
                              create_timetable_entry, create_prediction,
                              create_pending_entry, check_judge_overlap,
                              check_room_overlap)
from core.security   import get_current_user
from schemas.schemas import (CaseCreate, CaseResponse, ScheduleRequest,
                              ConfirmedResponse, ConflictResponse)

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from predictor import DurationPredictor

router   = APIRouter(prefix="/api/cases", tags=["Cases"])
_predictor: Optional[DurationPredictor] = None

def get_predictor() -> DurationPredictor:
    global _predictor
    if _predictor is None:
        _predictor = DurationPredictor()
    return _predictor


# ─── Register a new case ──────────────────────────────────────────────────────
@router.post("/", response_model=CaseResponse, status_code=201,
             summary="Register a new court case")
def register_case(payload: CaseCreate, db: Session = Depends(get_db),
                  current_user=Depends(get_current_user)):
    if get_case_by_number(db, payload.case_number):
        raise HTTPException(status_code=409,
                            detail=f"Case number '{payload.case_number}' already exists.")
    # Validate judge exists
    judge = get_judge_by_id(db, payload.judge_id)
    if not judge:
        raise HTTPException(status_code=404, detail="Judge not found.")
    # Validate courtroom exists
    room = get_courtroom_by_id(db, payload.courtroom_id)
    if not room:
        raise HTTPException(status_code=404, detail="Courtroom not found.")

    case = create_case(
        db           = db,
        case_number  = payload.case_number,
        case_type    = payload.case_type,
        num_parties  = payload.num_parties,
        priority     = payload.priority,
        judge_id     = payload.judge_id,
        courtroom_id = payload.courtroom_id,
        description  = payload.description,
        created_by   = current_user.id,
    )
    return case


@router.get("", response_model=None, summary="List all cases")
@router.get("/", response_model=None, summary="List all cases", include_in_schema=False)
def list_cases(status: Optional[str] = None,
               db: Session = Depends(get_db),
               current_user=Depends(get_current_user)):
    cases = get_all_cases(db, status=status)
    result = []
    for c in cases:
        judge = get_judge_by_id(db, c.judge_id) if c.judge_id else None
        result.append({
            "id":           c.id,
            "case_number":  c.case_number,
            "title":        c.description or c.case_number,
            "case_type":    c.case_type,
            "num_parties":  c.num_parties,
            "priority":     c.priority.lower() if c.priority else "normal",
            "status":       c.status,
            "description":  c.description,
            "judge_id":     c.judge_id,
            "assigned_judge_id": c.judge_id,
            "judge_name":   judge.name if judge else None,
            "courtroom_id": c.courtroom_id,
            "created_at":   c.created_at.isoformat(),
            "notes":        c.description or "",
        })
    return result


@router.get("/{case_id}", response_model=CaseResponse, summary="Get a case by ID")
def get_case(case_id: str, db: Session = Depends(get_db),
             current_user=Depends(get_current_user)):
    case = get_case_by_id(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")
    return case



@router.delete("/{case_id}", summary="Delete a case")
def remove_case(case_id: str, db: Session = Depends(get_db),
                current_user=Depends(get_current_user)):
    if not delete_case(db, case_id):
        raise HTTPException(status_code=404, detail="Case not found.")
    return {"message": "Case deleted successfully."}


@router.post("/{case_id}/schedule", summary="Trigger AI scheduling for a case")
def schedule_case(case_id: str, payload: ScheduleRequest,
                  db: Session = Depends(get_db),
                  current_user=Depends(get_current_user)):
    """
    Two-stage AI scheduling pipeline:
    Stage 1 → Random Forest predicts hearing duration
    Stage 2 → Constraint engine checks all four judicial rules (C3→C4→C1→C2)
    Returns CONFIRMED or CONFLICT.
    """
    # Load case
    case = get_case_by_id(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")
    if case.status == "confirmed":
        raise HTTPException(status_code=400, detail="Case already scheduled.")

    # Load judge and courtroom
    judge = get_judge_by_id(db, case.judge_id)
    room  = get_courtroom_by_id(db, case.courtroom_id)
    if not judge or not room:
        raise HTTPException(status_code=400, detail="Judge or courtroom not found.")

    predictor = get_predictor()
    predicted_duration = predictor.predict(
        case_type   = case.case_type,
        num_parties = case.num_parties,
        priority    = case.priority,
        judge_id    = judge.judge_code,
    )

    # Save prediction to audit log
    create_prediction(db, case_id=case.id,
                      predicted_duration=predicted_duration)

    proposed_start = payload.proposed_start
    proposed_end   = proposed_start + __import__('datetime').timedelta(
                         minutes=predicted_duration)

    
    if case.case_type not in judge.specialisation_list:
        reason = (f"[C3 – Specialisation] Judge {judge.judge_code} ({judge.name}) "
                  f"is not specialised in '{case.case_type}'. "
                  f"Specialisations: {judge.specialisations}.")
        _flag_conflict(db, case, room.id, reason)
        return ConflictResponse(
            status="CONFLICT", case_id=case.id,
            conflict_reason=reason,
            queue_id=case.pending.id if case.pending else "",
            flagged_at=str(datetime.utcnow()),
            predicted_duration_mins=predicted_duration,
        )

    if not room.is_active:
        reason = f"[C4 – Capacity] Courtroom {room.room_code} is currently inactive."
        _flag_conflict(db, case, room.id, reason)
        return ConflictResponse(status="CONFLICT", case_id=case.id,
            conflict_reason=reason, queue_id="",
            flagged_at=str(datetime.utcnow()),
            predicted_duration_mins=predicted_duration)

    if case.num_parties > room.capacity:
        reason = (f"[C4 – Capacity] Courtroom {room.room_code} (capacity {room.capacity}) "
                  f"is too small for {case.num_parties} parties.")
        _flag_conflict(db, case, room.id, reason)
        return ConflictResponse(status="CONFLICT", case_id=case.id,
            conflict_reason=reason, queue_id="",
            flagged_at=str(datetime.utcnow()),
            predicted_duration_mins=predicted_duration)

    overlap = check_judge_overlap(db, judge.id, proposed_start, proposed_end)
    if overlap:
        reason = (f"[C1 – Judge Availability] Judge {judge.judge_code} has a confirmed "
                  f"hearing for case {overlap.case_id} from "
                  f"{overlap.start_time.strftime('%Y-%m-%d %H:%M')} to "
                  f"{overlap.end_time.strftime('%H:%M')}.")
        _flag_conflict(db, case, room.id, reason)
        return ConflictResponse(status="CONFLICT", case_id=case.id,
            conflict_reason=reason, queue_id="",
            flagged_at=str(datetime.utcnow()),
            predicted_duration_mins=predicted_duration)

    overlap = check_room_overlap(db, room.id, proposed_start, proposed_end)
    if overlap:
        reason = (f"[C2 – Courtroom Availability] Courtroom {room.room_code} is booked "
                  f"for case {overlap.case_id} from "
                  f"{overlap.start_time.strftime('%Y-%m-%d %H:%M')} to "
                  f"{overlap.end_time.strftime('%H:%M')}.")
        _flag_conflict(db, case, room.id, reason)
        return ConflictResponse(status="CONFLICT", case_id=case.id,
            conflict_reason=reason, queue_id="",
            flagged_at=str(datetime.utcnow()),
            predicted_duration_mins=predicted_duration)

    slot = create_timetable_entry(
        db           = db,
        case_id      = case.id,
        judge_id     = judge.id,
        courtroom_id = room.id,
        start_time   = proposed_start,
        end_time     = proposed_end,
        duration_mins= predicted_duration,
    )
    update_case_status(db, case.id, "confirmed")

    return ConfirmedResponse(
        status                  = "CONFIRMED",
        case_id                 = case.id,
        case_type               = case.case_type,
        judge_id                = judge.judge_code,
        courtroom_id            = room.room_code,
        start_time              = proposed_start.isoformat(),
        end_time                = proposed_end.isoformat(),
        predicted_duration_mins = predicted_duration,
        slot_id                 = slot.id,
    )


def _flag_conflict(db, case, room_id: str, reason: str):
    """Helper: flag case as conflicted and add to pending queue."""
    update_case_status(db, case.id, "conflicted")
    create_pending_entry(db, case_id=case.id,
                         conflict_reason=reason,
                         courtroom_id=room_id)
