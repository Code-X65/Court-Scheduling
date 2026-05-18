

from fastapi         import APIRouter, Depends, HTTPException
from sqlalchemy.orm  import Session
from typing          import List, Optional

from db.database     import get_db
from db.crud         import (get_all_timetable, get_timetable_by_judge,
                              get_pending_queue, resolve_pending, get_stats)
from core.security   import get_current_user
from schemas.schemas import (TimetableResponse, PendingResponse,
                              ResolveRequest, StatsResponse)

router = APIRouter(prefix="/api", tags=["Timetable & Stats"])


@router.get("/timetable", response_model=List[TimetableResponse],
            summary="Get all confirmed hearing slots")
def get_timetable(judge_id: Optional[str] = None,
                  db: Session = Depends(get_db),
                  current_user=Depends(get_current_user)):
    if judge_id:
        return get_timetable_by_judge(db, judge_id)
    return get_all_timetable(db)


@router.get("/pending", response_model=List[PendingResponse],
            summary="Get all pending (conflicted) cases")
def get_pending(reviewed: Optional[bool] = None,
                db: Session = Depends(get_db),
                current_user=Depends(get_current_user)):
    return get_pending_queue(db, reviewed=reviewed)


@router.patch("/pending/{queue_id}/resolve", response_model=PendingResponse,
              summary="Mark a pending case as reviewed by admin")
def resolve_queue_item(queue_id: str, payload: ResolveRequest,
                        db: Session = Depends(get_db),
                        current_user=Depends(get_current_user)):
    entry = resolve_pending(db, queue_id, current_user.id, payload.resolution_notes)
    if not entry:
        raise HTTPException(status_code=404, detail="Pending entry not found.")
    return entry


@router.get("/stats", response_model=StatsResponse,
            summary="System performance metrics and conflict rate")
def get_system_stats(db: Session = Depends(get_db),
                     current_user=Depends(get_current_user)):
    return get_stats(db)
