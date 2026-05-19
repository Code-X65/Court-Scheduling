
from fastapi        import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing         import List, Optional
from datetime       import datetime

from db.database    import get_db
from db.models      import Timetable, Case, Judge, Courtroom
from core.security  import get_current_user

router = APIRouter(prefix="/api/hearings", tags=["Hearings"])


def _format_slot(slot, db):
    case     = db.query(Case).filter(Case.id == slot.case_id).first()
    judge    = db.query(Judge).filter(Judge.id == slot.judge_id).first()
    courtroom= db.query(Courtroom).filter(Courtroom.id == slot.courtroom_id).first()
    return {
        "id":           slot.id,
        "case_id":      slot.case_id,
        "case_number":  case.case_number   if case      else None,
        "case_type":    case.case_type     if case      else None,
        "judge_id":     slot.judge_id,
        "judge_name":   judge.name         if judge     else None,
        "judge_code":   judge.judge_code   if judge     else None,
        "courtroom_id": slot.courtroom_id,
        "courtroom_name": courtroom.name   if courtroom else None,
        "courtroom_code": courtroom.room_code if courtroom else None,
        "start_time":   slot.start_time.isoformat(),
        "end_time":     slot.end_time.isoformat(),
        "duration_mins":slot.duration_mins,
        "confirmed_at": slot.confirmed_at.isoformat(),
        "status":       "confirmed",
    }


@router.get("", summary="Get all confirmed hearings")
@router.get("/", summary="Get all confirmed hearings", include_in_schema=False)
def get_hearings(
    judge_id:     Optional[str] = None,
    courtroom_id: Optional[str] = None,
    from_date:    Optional[str] = None,
    to_date:      Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    q = db.query(Timetable)

    if judge_id:
        q = q.filter(Timetable.judge_id == judge_id)
    if courtroom_id:
        q = q.filter(Timetable.courtroom_id == courtroom_id)
    if from_date:
        q = q.filter(Timetable.start_time >= datetime.fromisoformat(from_date))
    if to_date:
        q = q.filter(Timetable.start_time <= datetime.fromisoformat(to_date))

    slots = q.order_by(Timetable.start_time).all()
    return [_format_slot(s, db) for s in slots]


@router.get("/{hearing_id}", summary="Get a single hearing by ID")
def get_hearing(
    hearing_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    slot = db.query(Timetable).filter(Timetable.id == hearing_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Hearing not found.")
    return _format_slot(slot, db)


@router.patch("/{hearing_id}/status", summary="Update hearing status")
def update_hearing_status(
    hearing_id: str,
    status: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    slot = db.query(Timetable).filter(Timetable.id == hearing_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Hearing not found.")
    # Update linked case status
    case = db.query(Case).filter(Case.id == slot.case_id).first()
    if case:
        case.status = status
        db.commit()
    return _format_slot(slot, db)