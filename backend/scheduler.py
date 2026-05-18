

from __future__ import annotations
from datetime   import datetime, timedelta
from typing     import Optional

from predictor        import DurationPredictor
from constraint_engine import ConstraintEngine, HearingRequest, SchedulingResult


class CourtScheduler:
    """
    High-level scheduling orchestrator.
    Instantiated once and reused across all API requests.
    """

    def __init__(
        self,
        predictor: Optional[DurationPredictor] = None,
        engine:    Optional[ConstraintEngine]  = None,
    ):
        self.predictor = predictor or DurationPredictor()
        self.engine    = engine    or ConstraintEngine()


    def schedule_case(
        self,
        case_id:        str,
        case_type:      str,
        num_parties:    int,
        priority:       str,
        judge_id:       str,
        courtroom_id:   str,
        proposed_start: datetime,
    ) -> dict:
        """
        Two-stage scheduling pipeline:
          Stage 1 – ML: predict hearing duration from case features
          Stage 2 – Rules: enforce all four judicial constraints

        Returns a structured dict for direct JSON serialization by FastAPI.
        """

        predicted_duration = self.predictor.predict(
            case_type   = case_type,
            num_parties = num_parties,
            priority    = priority,
            judge_id    = judge_id,
        )

        req = HearingRequest(
            case_id            = case_id,
            case_type          = case_type,
            num_parties        = num_parties,
            priority           = priority,
            judge_id           = judge_id,
            courtroom_id       = courtroom_id,
            proposed_start     = proposed_start,
            predicted_duration = predicted_duration,
        )

        result: SchedulingResult = self.engine.schedule(req)

        if result.success:
            h = result.confirmed
            return {
                "status":             "CONFIRMED",
                "case_id":            h.case_id,
                "case_type":          h.case_type,
                "judge_id":           h.judge_id,
                "courtroom_id":       h.courtroom_id,
                "start_time":         h.start_time.isoformat(),
                "end_time":           h.end_time.isoformat(),
                "predicted_duration_mins": h.duration_mins,
                "slot_id":            h.slot_id,
            }
        else:
            p = result.pending
            return {
                "status":            "CONFLICT",
                "case_id":           p.case_id,
                "conflict_reason":   p.conflict_reason,
                "queue_id":          p.queue_id,
                "flagged_at":        p.flagged_at.isoformat(),
                "predicted_duration_mins": predicted_duration,
            }


    def stats(self) -> dict:
        total     = len(self.engine.timetable) + len(self.engine.pending_queue)
        confirmed = len(self.engine.timetable)
        conflicts = len(self.engine.pending_queue)
        return {
            "total_scheduling_attempts": total,
            "confirmed":                 confirmed,
            "conflicts_pending":         conflicts,
            "conflict_rate_pct":         round(
                (conflicts / total * 100) if total else 0.0, 2
            ),
        }


if __name__ == "__main__":
    scheduler = CourtScheduler()

    base = datetime(2025, 9, 1, 9, 0)

    demo_requests = [
        # (case_id, type, parties, priority, judge, room, start_offset_mins)
        ("CASE00001", "Civil",         3, "High",   "J001", "CR01", 0),
        ("CASE00002", "Criminal",      5, "High",   "J002", "CR02", 0),
        ("CASE00003", "Family",        2, "Medium", "J003", "CR03", 0),
        ("CASE00004", "Commercial",    4, "Medium", "J004", "CR05", 0),
        # Intentional conflict: J001 busy at 09:00 (CASE00001)
        ("CASE00005", "Civil",         3, "Low",    "J001", "CR06", 30),
        # Intentional conflict: CR02 busy at 09:00 (CASE00002)
        ("CASE00006", "Criminal",      6, "Medium", "J005", "CR02", 60),
        # Intentional conflict: J003 not specialised in Constitutional
        ("CASE00007", "Constitutional",7, "High",   "J003", "CR07", 300),
        # Valid case after conflict
        ("CASE00008", "Labour",        2, "Low",    "J007", "CR08", 0),
    ]

    print("\n" + "=" * 65)
    print("  COURT SCHEDULER – DEMO RUN")
    print("=" * 65)

    for r in demo_requests:
        res = scheduler.schedule_case(
            case_id        = r[0],
            case_type      = r[1],
            num_parties    = r[2],
            priority       = r[3],
            judge_id       = r[4],
            courtroom_id   = r[5],
            proposed_start = base + timedelta(minutes=r[6]),
        )
        icon = "✓" if res["status"] == "CONFIRMED" else "✗"
        print(f"\n  [{icon} {res['status']}] {r[0]}")
        if res["status"] == "CONFIRMED":
            print(f"      Judge: {res['judge_id']}  |  Room: {res['courtroom_id']}")
            print(f"      {res['start_time']}  →  {res['end_time']}")
            print(f"      Predicted duration: {res['predicted_duration_mins']} mins")
        else:
            print(f"      Reason: {res['conflict_reason']}")
            print(f"      Predicted duration: {res['predicted_duration_mins']} mins")

    print("\n" + "=" * 65)
    print("  FINAL STATS")
    print("=" * 65)
    for k, v in scheduler.stats().items():
        print(f"  {k:<35}: {v}")
