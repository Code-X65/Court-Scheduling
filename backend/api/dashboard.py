from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from db.database import get_db
from db.models import Timetable, Case
from db.crud import get_stats
from core.security import get_current_user

router = APIRouter(prefix="/api", tags=["Dashboard"])

@router.get("/dashboard/stats")
def dashboard_stats(db: Session = Depends(get_db),
                    current_user=Depends(get_current_user)):
    stats = get_stats(db)

    # Get real upcoming hearings (confirmed, from now onwards)
    now = datetime.utcnow()
    upcoming = (
        db.query(Timetable)
        .filter(Timetable.start_time >= now)
        .order_by(Timetable.start_time)
        .limit(5)
        .all()
    )

    upcoming_list = []
    for slot in upcoming:
        case = db.query(Case).filter(Case.id == slot.case_id).first()
        upcoming_list.append({
            "case_id":     slot.case_id,
            "case_number": case.case_number if case else slot.case_id,
            "start_time":  slot.start_time.isoformat(),
            "end_time":    slot.end_time.isoformat(),
            "judge_id":    slot.judge_id,
            "courtroom_id": slot.courtroom_id,
        })

    # Last schedule run = most recent timetable entry created
    last_slot = db.query(Timetable).order_by(
        Timetable.confirmed_at.desc()
    ).first()

    return {
        "total_cases":          stats["total_cases"],
        "pending_cases":        stats["pending"],
        "scheduled_this_week":  stats["confirmed"],
        "conflict_rate_pct":    stats["conflict_rate_pct"],
        "upcoming_hearings":    upcoming_list,
        "workload_chart":       [],
        "last_schedule_run":    last_slot.confirmed_at.isoformat() if last_slot else None,
    }