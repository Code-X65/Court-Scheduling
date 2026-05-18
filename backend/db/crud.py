from datetime       import datetime
from typing         import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy     import and_

from db.models      import (User, Judge, Courtroom, Case,
                             Timetable, MLPrediction, PendingQueue)
from core.security  import hash_password



def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()

def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def get_all_users(db: Session) -> List[User]:
    return db.query(User).all()

def create_user(db: Session, username: str, email: str,
                full_name: str, password: str, role: str = "admin") -> User:
    user = User(
        username        = username,
        email           = email,
        full_name       = full_name,
        hashed_password = hash_password(password),
        role            = role,
    )
    db.add(user); db.commit(); db.refresh(user)
    return user

def update_user_status(db: Session, user_id: str, is_active: bool) -> Optional[User]:
    user = get_user_by_id(db, user_id)
    if user:
        user.is_active = is_active
        db.commit(); db.refresh(user)
    return user

def delete_user(db: Session, user_id: str) -> bool:
    user = get_user_by_id(db, user_id)
    if user:
        db.delete(user); db.commit()
        return True
    return False



def get_all_judges(db: Session) -> List[Judge]:
    return db.query(Judge).order_by(Judge.judge_code).all()

def get_judge_by_id(db: Session, judge_id: str) -> Optional[Judge]:
    return db.query(Judge).filter(Judge.id == judge_id).first()

def get_judge_by_code(db: Session, code: str) -> Optional[Judge]:
    return db.query(Judge).filter(Judge.judge_code == code).first()

def create_judge(db: Session, judge_code: str, name: str,
                 specialisations: List[str], court_location: str = None) -> Judge:
    judge = Judge(
        judge_code      = judge_code,
        name            = name,
        specialisations = ",".join(specialisations),
        court_location  = court_location,
    )
    db.add(judge); db.commit(); db.refresh(judge)
    return judge

def update_judge(db: Session, judge_id: str, **kwargs) -> Optional[Judge]:
    judge = get_judge_by_id(db, judge_id)
    if not judge:
        return None
    if "specialisations" in kwargs and isinstance(kwargs["specialisations"], list):
        kwargs["specialisations"] = ",".join(kwargs["specialisations"])
    for k, v in kwargs.items():
        if hasattr(judge, k):
            setattr(judge, k, v)
    judge.updated_at = datetime.utcnow()
    db.commit(); db.refresh(judge)
    return judge

def delete_judge(db: Session, judge_id: str) -> bool:
    judge = get_judge_by_id(db, judge_id)
    if judge:
        db.delete(judge); db.commit()
        return True
    return False


def get_all_courtrooms(db: Session) -> List[Courtroom]:
    return db.query(Courtroom).order_by(Courtroom.room_code).all()

def get_courtroom_by_id(db: Session, room_id: str) -> Optional[Courtroom]:
    return db.query(Courtroom).filter(Courtroom.id == room_id).first()

def get_courtroom_by_code(db: Session, code: str) -> Optional[Courtroom]:
    return db.query(Courtroom).filter(Courtroom.room_code == code).first()

def create_courtroom(db: Session, room_code: str, name: str,
                     capacity: int, location: str = None) -> Courtroom:
    room = Courtroom(room_code=room_code, name=name,
                     capacity=capacity, location=location)
    db.add(room); db.commit(); db.refresh(room)
    return room

def update_courtroom(db: Session, room_id: str, **kwargs) -> Optional[Courtroom]:
    room = get_courtroom_by_id(db, room_id)
    if not room:
        return None
    for k, v in kwargs.items():
        if hasattr(room, k):
            setattr(room, k, v)
    room.updated_at = datetime.utcnow()
    db.commit(); db.refresh(room)
    return room

def delete_courtroom(db: Session, room_id: str) -> bool:
    room = get_courtroom_by_id(db, room_id)
    if room:
        db.delete(room); db.commit()
        return True
    return False



def get_all_cases(db: Session, status: str = None) -> List[Case]:
    q = db.query(Case)
    if status:
        q = q.filter(Case.status == status)
    return q.order_by(Case.created_at.desc()).all()

def get_case_by_id(db: Session, case_id: str) -> Optional[Case]:
    return db.query(Case).filter(Case.id == case_id).first()

def get_case_by_number(db: Session, case_number: str) -> Optional[Case]:
    return db.query(Case).filter(Case.case_number == case_number).first()

def create_case(db: Session, case_number: str, case_type: str,
                num_parties: int, priority: str, judge_id: str,
                courtroom_id: str, description: str = None,
                created_by: str = None) -> Case:
    case = Case(
        case_number  = case_number,
        case_type    = case_type,
        num_parties  = num_parties,
        priority     = priority,
        judge_id     = judge_id,
        courtroom_id = courtroom_id,
        description  = description,
        created_by   = created_by,
        status       = "pending",
    )
    db.add(case); db.commit(); db.refresh(case)
    return case

def update_case_status(db: Session, case_id: str, status: str) -> Optional[Case]:
    case = get_case_by_id(db, case_id)
    if case:
        case.status     = status
        case.updated_at = datetime.utcnow()
        db.commit(); db.refresh(case)
    return case

def delete_case(db: Session, case_id: str) -> bool:
    case = get_case_by_id(db, case_id)
    if case:
        db.delete(case); db.commit()
        return True
    return False



def get_all_timetable(db: Session) -> List[Timetable]:
    return db.query(Timetable).order_by(Timetable.start_time).all()

def get_timetable_by_judge(db: Session, judge_id: str) -> List[Timetable]:
    return db.query(Timetable).filter(
        Timetable.judge_id == judge_id
    ).order_by(Timetable.start_time).all()

def create_timetable_entry(db: Session, case_id: str, judge_id: str,
                            courtroom_id: str, start_time: datetime,
                            end_time: datetime, duration_mins: int) -> Timetable:
    entry = Timetable(
        case_id      = case_id,
        judge_id     = judge_id,
        courtroom_id = courtroom_id,
        start_time   = start_time,
        end_time     = end_time,
        duration_mins= duration_mins,
    )
    db.add(entry); db.commit(); db.refresh(entry)
    return entry

def check_judge_overlap(db: Session, judge_id: str,
                         start: datetime, end: datetime,
                         exclude_case_id: str = None) -> Optional[Timetable]:
    """Returns an overlapping timetable entry if one exists, else None."""
    q = db.query(Timetable).filter(
        Timetable.judge_id == judge_id,
        Timetable.start_time < end,
        Timetable.end_time   > start,
    )
    if exclude_case_id:
        q = q.filter(Timetable.case_id != exclude_case_id)
    return q.first()

def check_room_overlap(db: Session, courtroom_id: str,
                        start: datetime, end: datetime,
                        exclude_case_id: str = None) -> Optional[Timetable]:
    """Returns an overlapping timetable entry if one exists, else None."""
    q = db.query(Timetable).filter(
        Timetable.courtroom_id == courtroom_id,
        Timetable.start_time < end,
        Timetable.end_time   > start,
    )
    if exclude_case_id:
        q = q.filter(Timetable.case_id != exclude_case_id)
    return q.first()


def create_prediction(db: Session, case_id: str,
                       predicted_duration: int,
                       model_version: str = "rf_v1.0") -> MLPrediction:
    pred = MLPrediction(
        case_id            = case_id,
        predicted_duration = predicted_duration,
        model_version      = model_version,
    )
    db.add(pred); db.commit(); db.refresh(pred)
    return pred



def get_pending_queue(db: Session, reviewed: bool = None) -> List[PendingQueue]:
    q = db.query(PendingQueue)
    if reviewed is not None:
        q = q.filter(PendingQueue.admin_reviewed == reviewed)
    return q.order_by(PendingQueue.flagged_at.desc()).all()

def create_pending_entry(db: Session, case_id: str,
                          conflict_reason: str,
                          courtroom_id: str = None) -> PendingQueue:
    entry = PendingQueue(
        case_id         = case_id,
        conflict_reason = conflict_reason,
        courtroom_id    = courtroom_id,
    )
    db.add(entry); db.commit(); db.refresh(entry)
    return entry

def resolve_pending(db: Session, queue_id: str, reviewer_id: str,
                     notes: str = None) -> Optional[PendingQueue]:
    entry = db.query(PendingQueue).filter(PendingQueue.id == queue_id).first()
    if entry:
        entry.admin_reviewed   = True
        entry.reviewed_by      = reviewer_id
        entry.reviewed_at      = datetime.utcnow()
        entry.resolution_notes = notes
        db.commit(); db.refresh(entry)
    return entry

def get_stats(db: Session) -> dict:
    total      = db.query(Case).count()
    confirmed  = db.query(Case).filter(Case.status == "confirmed").count()
    conflicted = db.query(Case).filter(Case.status == "conflicted").count()
    pending    = db.query(Case).filter(Case.status == "pending").count()
    scr        = round(conflicted / total * 100, 2) if total else 0.0
    return {
        "total_cases":    total,
        "confirmed":      confirmed,
        "conflicted":     conflicted,
        "pending":        pending,
        "conflict_rate_pct": scr,
    }
