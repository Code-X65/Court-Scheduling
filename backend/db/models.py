

import uuid
from datetime          import datetime
from sqlalchemy        import (Column, String, Integer, Boolean,
                               DateTime, Text, Float, ForeignKey, Enum)
from sqlalchemy.orm    import relationship
from sqlalchemy.dialects.postgresql import UUID

from db.database import Base


def new_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id           = Column(String, primary_key=True, default=new_uuid)
    username     = Column(String(50),  unique=True, nullable=False, index=True)
    email        = Column(String(120), unique=True, nullable=False)
    full_name    = Column(String(120), nullable=False)
    hashed_password = Column(String, nullable=False)
    role         = Column(String(20), default="admin")   # "admin" | "superadmin"
    is_active    = Column(Boolean, default=True)
    created_at   = Column(DateTime, default=datetime.utcnow)


class Judge(Base):
    __tablename__ = "judges"

    id               = Column(String, primary_key=True, default=new_uuid)
    judge_code       = Column(String(10),  unique=True, nullable=False)  # e.g. J001
    name             = Column(String(120), nullable=False)
    specialisations  = Column(Text, nullable=False)   # comma-separated: "Civil,Commercial,Land"
    is_available     = Column(Boolean, default=True)
    court_location   = Column(String(120), nullable=True)
    created_at       = Column(DateTime, default=datetime.utcnow)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    cases            = relationship("Case",      back_populates="judge")
    timetable_slots  = relationship("Timetable", back_populates="judge")

    @property
    def specialisation_list(self):
        return [s.strip() for s in self.specialisations.split(",")]


class Courtroom(Base):
    __tablename__ = "courtrooms"

    id          = Column(String, primary_key=True, default=new_uuid)
    room_code   = Column(String(10),  unique=True, nullable=False)  # e.g. CR01
    name        = Column(String(120), nullable=False)
    capacity    = Column(Integer, nullable=False)
    location    = Column(String(200), nullable=True)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    timetable_slots = relationship("Timetable",   back_populates="courtroom")
    pending_items   = relationship("PendingQueue", back_populates="courtroom")


class Case(Base):
    __tablename__ = "cases"

    id           = Column(String, primary_key=True, default=new_uuid)
    case_number  = Column(String(20), unique=True, nullable=False)  # e.g. CASE00001
    case_type    = Column(String(50),  nullable=False)
    num_parties  = Column(Integer,     nullable=False)
    priority     = Column(String(10),  nullable=False)   # High | Medium | Low
    status       = Column(String(20),  default="pending")  # pending | confirmed | conflicted | closed
    description  = Column(Text, nullable=True)
    judge_id     = Column(String, ForeignKey("judges.id"), nullable=True)
    courtroom_id = Column(String, ForeignKey("courtrooms.id"), nullable=True)
    created_by   = Column(String, ForeignKey("users.id"), nullable=True)
    created_at   = Column(DateTime, default=datetime.utcnow)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    judge        = relationship("Judge",     back_populates="cases")
    courtroom    = relationship("Courtroom", foreign_keys=[courtroom_id])
    timetable    = relationship("Timetable", back_populates="case",      uselist=False)
    prediction   = relationship("MLPrediction", back_populates="case",   uselist=False)
    pending      = relationship("PendingQueue",  back_populates="case",  uselist=False)
    creator      = relationship("User", foreign_keys=[created_by])


class Timetable(Base):
    __tablename__ = "timetable"

    id            = Column(String, primary_key=True, default=new_uuid)
    case_id       = Column(String, ForeignKey("cases.id"),      nullable=False)
    judge_id      = Column(String, ForeignKey("judges.id"),     nullable=False)
    courtroom_id  = Column(String, ForeignKey("courtrooms.id"), nullable=False)
    start_time    = Column(DateTime, nullable=False)
    end_time      = Column(DateTime, nullable=False)
    duration_mins = Column(Integer,  nullable=False)
    confirmed_at  = Column(DateTime, default=datetime.utcnow)

    # Relationships
    case      = relationship("Case",      back_populates="timetable")
    judge     = relationship("Judge",     back_populates="timetable_slots")
    courtroom = relationship("Courtroom", back_populates="timetable_slots")


class MLPrediction(Base):
    __tablename__ = "ml_predictions"

    id                  = Column(String,  primary_key=True, default=new_uuid)
    case_id             = Column(String,  ForeignKey("cases.id"), nullable=False)
    predicted_duration  = Column(Integer, nullable=False)
    model_version       = Column(String(50), default="rf_v1.0")
    confidence_score    = Column(Float,   nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="prediction")


class PendingQueue(Base):
    __tablename__ = "pending_queue"

    id               = Column(String,  primary_key=True, default=new_uuid)
    case_id          = Column(String,  ForeignKey("cases.id"),      nullable=False)
    courtroom_id     = Column(String,  ForeignKey("courtrooms.id"), nullable=True)
    conflict_reason  = Column(Text,    nullable=False)
    flagged_at       = Column(DateTime, default=datetime.utcnow)
    admin_reviewed   = Column(Boolean,  default=False)
    reviewed_by      = Column(String,  ForeignKey("users.id"), nullable=True)
    reviewed_at      = Column(DateTime, nullable=True)
    resolution_notes = Column(Text,    nullable=True)

    case      = relationship("Case",      back_populates="pending")
    courtroom = relationship("Courtroom", back_populates="pending_items")
    reviewer  = relationship("User",      foreign_keys=[reviewed_by])
