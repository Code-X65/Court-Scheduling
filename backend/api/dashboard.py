from fastapi        import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy     import func
from datetime       import datetime

from db.database    import get_db
from db.models      import Timetable, Case, Judge
from db.crud        import get_stats
from core.security  import get_current_user

router = APIRouter(prefix="/api", tags=["Dashboard"])


@router.get("/dashboard/stats")
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    stats = get_stats(db)

    # ── Upcoming hearings ─────────────────────────────────────────────────────
    now      = datetime.utcnow()
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
            "case_id":      slot.case_id,
            "case_number":  case.case_number if case else slot.case_id,
            "start_time":   slot.start_time.isoformat(),
            "end_time":     slot.end_time.isoformat(),
            "judge_id":     slot.judge_id,
            "courtroom_id": slot.courtroom_id,
        })

    # ── Judge workload ────────────────────────────────────────────────────────
    judge_loads = (
        db.query(Timetable.judge_id, func.count(Timetable.id).label("cnt"))
        .group_by(Timetable.judge_id)
        .order_by(func.count(Timetable.id).desc())
        .limit(8)
        .all()
    )

    judges_map = {j.id: j for j in db.query(Judge).all()}
    workload   = [
        {
            "judge_id":   jid,
            "judge_name": judges_map[jid].name if jid in judges_map else jid,
            "hearings":   cnt,
        }
        for jid, cnt in judge_loads
    ]

    # ── Last schedule run ─────────────────────────────────────────────────────
    last_slot = (
        db.query(Timetable)
        .order_by(Timetable.confirmed_at.desc())
        .first()
    )

    return {
        "total_cases":         stats["total_cases"],
        "pending_cases":       stats["pending"],
        "scheduled_this_week": stats["confirmed"],
        "conflict_rate_pct":   stats["conflict_rate_pct"],
        "upcoming_hearings":   upcoming_list,
        "workload_chart":      workload,
        "last_schedule_run":   last_slot.confirmed_at.isoformat() if last_slot else None,
    }