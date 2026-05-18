
from __future__ import annotations
import uuid
from dataclasses import dataclass, field
from datetime    import datetime, timedelta
from typing      import List, Optional, Dict, Tuple

@dataclass
class Judge:
    judge_id:         str
    name:             str
    specialisations:  List[str]   # e.g. ["Civil", "Commercial"]


@dataclass
class Courtroom:
    room_id:   str
    name:      str
    capacity:  int                # maximum number of parties
    is_active: bool = True


@dataclass
class HearingRequest:
    case_id:            str
    case_type:          str
    num_parties:        int
    priority:           str           # "High" | "Medium" | "Low"
    judge_id:           str
    courtroom_id:       str
    proposed_start:     datetime
    predicted_duration: int           # minutes (from Random Forest model)

    @property
    def proposed_end(self) -> datetime:
        return self.proposed_start + timedelta(minutes=self.predicted_duration)


@dataclass
class ConfirmedHearing:
    slot_id:     str
    case_id:     str
    case_type:   str
    judge_id:    str
    courtroom_id: str
    start_time:  datetime
    end_time:    datetime
    duration_mins: int


@dataclass
class PendingEntry:
    queue_id:       str
    case_id:        str
    conflict_reason: str
    flagged_at:     datetime


@dataclass
class SchedulingResult:
    success:         bool
    confirmed:       Optional[ConfirmedHearing] = None
    pending:         Optional[PendingEntry]     = None
    violated_constraint: Optional[str]          = None


class ConstraintEngine:
    """
    In-memory implementation of the rule-based constraint engine.
    In production this would query a PostgreSQL database instead
    of the local timetable list.
    """

    def __init__(
        self,
        judges:     Optional[Dict[str, Judge]]     = None,
        courtrooms: Optional[Dict[str, Courtroom]] = None,
    ):
        # Default fixture data  (matches generate_dataset.py)
        self.judges: Dict[str, Judge] = judges or {
            "J001": Judge("J001", "Justice Adeyemi",   ["Civil", "Commercial", "Land"]),
            "J002": Judge("J002", "Justice Okonkwo",   ["Criminal", "Constitutional"]),
            "J003": Judge("J003", "Justice Babatunde", ["Family", "Labour", "Civil"]),
            "J004": Judge("J004", "Justice Eze",       ["Commercial", "Civil", "Land"]),
            "J005": Judge("J005", "Justice Nwosu",     ["Criminal", "Labour"]),
            "J006": Judge("J006", "Justice Aliyu",     ["Constitutional", "Criminal", "Civil"]),
            "J007": Judge("J007", "Justice Afolabi",   ["Family", "Labour", "Commercial"]),
            "J008": Judge("J008", "Justice Danjuma",   ["Land", "Civil", "Family"]),
        }

        self.courtrooms: Dict[str, Courtroom] = courtrooms or {
            "CR01": Courtroom("CR01", "Courtroom 1",  12, True),
            "CR02": Courtroom("CR02", "Courtroom 2",  8,  True),
            "CR03": Courtroom("CR03", "Courtroom 3",  15, True),
            "CR04": Courtroom("CR04", "Courtroom 4",  6,  True),
            "CR05": Courtroom("CR05", "Courtroom 5",  10, True),
            "CR06": Courtroom("CR06", "Courtroom 6",  20, True),
            "CR07": Courtroom("CR07", "Courtroom 7",  8,  True),
            "CR08": Courtroom("CR08", "Courtroom 8",  12, True),
        }

        # In-memory timetable (list of confirmed hearings)
        self.timetable: List[ConfirmedHearing] = []
        self.pending_queue: List[PendingEntry]  = []


    def _overlaps(
        self,
        start_a: datetime, end_a: datetime,
        start_b: datetime, end_b: datetime,
    ) -> bool:
        """Return True if time windows [a, b) overlap."""
        return start_a < end_b and start_b < end_a

    def _judge_is_free(
        self, judge_id: str,
        proposed_start: datetime, proposed_end: datetime,
        exclude_case: Optional[str] = None,
    ) -> Tuple[bool, Optional[str]]:
        for h in self.timetable:
            if h.judge_id != judge_id:
                continue
            if exclude_case and h.case_id == exclude_case:
                continue
            if self._overlaps(proposed_start, proposed_end, h.start_time, h.end_time):
                return False, (
                    f"Judge {judge_id} already has a confirmed hearing for case "
                    f"{h.case_id} from "
                    f"{h.start_time.strftime('%Y-%m-%d %H:%M')} to "
                    f"{h.end_time.strftime('%H:%M')}."
                )
        return True, None

    def _room_is_free(
        self, room_id: str,
        proposed_start: datetime, proposed_end: datetime,
        exclude_case: Optional[str] = None,
    ) -> Tuple[bool, Optional[str]]:
        for h in self.timetable:
            if h.courtroom_id != room_id:
                continue
            if exclude_case and h.case_id == exclude_case:
                continue
            if self._overlaps(proposed_start, proposed_end, h.start_time, h.end_time):
                return False, (
                    f"Courtroom {room_id} is already booked for case "
                    f"{h.case_id} from "
                    f"{h.start_time.strftime('%Y-%m-%d %H:%M')} to "
                    f"{h.end_time.strftime('%H:%M')}."
                )
        return True, None

    def _judge_specialisation_ok(
        self, judge_id: str, case_type: str
    ) -> Tuple[bool, Optional[str]]:
        judge = self.judges.get(judge_id)
        if judge is None:
            return False, f"Judge {judge_id} not found in registry."
        if case_type not in judge.specialisations:
            return False, (
                f"Judge {judge_id} ({judge.name}) is not specialised in "
                f"'{case_type}' cases. "
                f"Specialisations: {judge.specialisations}."
            )
        return True, None

    def _capacity_ok(
        self, room_id: str, num_parties: int
    ) -> Tuple[bool, Optional[str]]:
        room = self.courtrooms.get(room_id)
        if room is None:
            return False, f"Courtroom {room_id} not found in registry."
        if not room.is_active:
            return False, f"Courtroom {room_id} is currently inactive."
        if num_parties > room.capacity:
            return False, (
                f"Courtroom {room_id} (capacity {room.capacity}) is too small "
                f"for {num_parties} parties."
            )
        return True, None


    def schedule(self, req: HearingRequest) -> SchedulingResult:
        """
        Attempt to schedule a hearing.

        Returns a SchedulingResult with success=True and a ConfirmedHearing
        if all four constraints pass, or success=False and a PendingEntry
        with a human-readable conflict reason if any constraint fails.
        """
        proposed_end = req.proposed_end

        ok, reason = self._judge_specialisation_ok(req.judge_id, req.case_type)
        if not ok:
            return self._reject(req, f"[C3 – Specialisation] {reason}")

        ok, reason = self._capacity_ok(req.courtroom_id, req.num_parties)
        if not ok:
            return self._reject(req, f"[C4 – Capacity] {reason}")

        ok, reason = self._judge_is_free(
            req.judge_id, req.proposed_start, proposed_end
        )
        if not ok:
            return self._reject(req, f"[C1 – Judge Availability] {reason}")

        ok, reason = self._room_is_free(
            req.courtroom_id, req.proposed_start, proposed_end
        )
        if not ok:
            return self._reject(req, f"[C2 – Courtroom Availability] {reason}")

        slot_id = str(uuid.uuid4())
        confirmed = ConfirmedHearing(
            slot_id      = slot_id,
            case_id      = req.case_id,
            case_type    = req.case_type,
            judge_id     = req.judge_id,
            courtroom_id = req.courtroom_id,
            start_time   = req.proposed_start,
            end_time     = proposed_end,
            duration_mins= req.predicted_duration,
        )
        self.timetable.append(confirmed)
        return SchedulingResult(success=True, confirmed=confirmed)

    def _reject(self, req: HearingRequest, reason: str) -> SchedulingResult:
        entry = PendingEntry(
            queue_id       = str(uuid.uuid4()),
            case_id        = req.case_id,
            conflict_reason= reason,
            flagged_at     = datetime.now(),
        )
        self.pending_queue.append(entry)
        return SchedulingResult(
            success=False,
            pending=entry,
            violated_constraint=reason,
        )

    def get_timetable(self) -> List[ConfirmedHearing]:
        return sorted(self.timetable, key=lambda h: h.start_time)

    def get_pending_queue(self) -> List[PendingEntry]:
        return list(self.pending_queue)

    def conflict_rate(self) -> float:
        total = len(self.timetable) + len(self.pending_queue)
        if total == 0:
            return 0.0
        return len(self.pending_queue) / total

    def print_timetable(self):
        print("\n" + "=" * 70)
        print("  CONFIRMED TIMETABLE")
        print("=" * 70)
        print(f"  {'Case ID':<12} {'Type':<14} {'Judge':<6} "
              f"{'Room':<6} {'Start':<17} {'End':<8} {'Dur':>6}")
        print(f"  {'-'*12} {'-'*14} {'-'*6} {'-'*6} {'-'*17} {'-'*8} {'-'*6}")
        for h in self.get_timetable():
            print(
                f"  {h.case_id:<12} {h.case_type:<14} {h.judge_id:<6} "
                f"{h.courtroom_id:<6} "
                f"{h.start_time.strftime('%Y-%m-%d %H:%M'):<17} "
                f"{h.end_time.strftime('%H:%M'):<8} "
                f"{h.duration_mins:>6} mins"
            )
        print(f"\n  Total confirmed : {len(self.timetable)}")
        print(f"  Total pending   : {len(self.pending_queue)}")
        print(f"  Conflict rate   : {self.conflict_rate()*100:.1f} %")
        print("=" * 70)

    def print_pending_queue(self):
        if not self.pending_queue:
            print("\n  [Pending Queue] Empty – no conflicts detected.")
            return
        print("\n" + "=" * 70)
        print("  PENDING QUEUE (Conflicts)")
        print("=" * 70)
        for e in self.pending_queue:
            print(f"  Case {e.case_id}: {e.conflict_reason}")
        print("=" * 70)


if __name__ == "__main__":
    from datetime import datetime

    engine = ConstraintEngine()
    base   = datetime(2025, 9, 1, 9, 0)  

    test_cases = [
        # (case_id,  type,          parties, priority, judge, room,  start_offset_mins, duration)
        ("CASE00001", "Civil",       3, "High",   "J001", "CR01", 0,   90),
        ("CASE00002", "Criminal",    5, "High",   "J002", "CR02", 0,  120),
        ("CASE00003", "Family",      2, "Medium", "J003", "CR03", 0,   60),
        # Conflict C1: J001 already busy 09:00-10:30 (CASE00001)
        ("CASE00004", "Commercial",  4, "Medium", "J001", "CR05", 30,  60),
        # Conflict C2: CR02 busy 09:00-11:00 (CASE00002)
        ("CASE00005", "Criminal",    3, "Low",    "J005", "CR02", 60,  45),
        # Conflict C3: J003 specialised in Family/Labour/Civil, not Constitutional
        ("CASE00006", "Constitutional", 6, "High", "J003", "CR06", 200, 150),
        # Conflict C4: 25 parties in CR04 (capacity 6)
        ("CASE00007", "Land",       25, "Medium", "J008", "CR04", 300,  80),
        # Valid: J002 free at 13:00
        ("CASE00008", "Criminal",    3, "Low",    "J002", "CR07", 240,  55),
    ]

    for tc in test_cases:
        req = HearingRequest(
            case_id            = tc[0],
            case_type          = tc[1],
            num_parties        = tc[2],
            priority           = tc[3],
            judge_id           = tc[4],
            courtroom_id       = tc[5],
            proposed_start     = base + timedelta(minutes=tc[6]),
            predicted_duration = tc[7],
        )
        result = engine.schedule(req)
        status = "✓ CONFIRMED" if result.success else "✗ CONFLICT"
        print(f"  [{status}]  {tc[0]}  |  {tc[1]:<14}  |  Judge {tc[4]}  |  Room {tc[5]}")
        if not result.success:
            print(f"             Reason: {result.violated_constraint}")

    engine.print_timetable()
    engine.print_pending_queue()
