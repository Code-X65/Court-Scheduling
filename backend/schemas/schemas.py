

from datetime import datetime
from typing   import List, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


VALID_CASE_TYPES = ["Civil","Criminal","Family","Commercial",
                    "Constitutional","Land","Labour"]
VALID_PRIORITIES = ["High","Medium","Low"]
VALID_ROLES      = ["admin","superadmin"]


class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user_role:    str
    full_name:    str

class UserCreate(BaseModel):
    username:  str        = Field(..., min_length=3, max_length=50)
    email:     EmailStr
    full_name: str        = Field(..., min_length=2)
    password:  str        = Field(..., min_length=6)
    role:      str        = "admin"

    @field_validator("role")
    def validate_role(cls, v):
        if v not in VALID_ROLES:
            raise ValueError(f"role must be one of {VALID_ROLES}")
        return v

class UserResponse(BaseModel):
    id:         str
    username:   str
    email:      str
    full_name:  str
    role:       str
    is_active:  bool
    created_at: datetime
    model_config = {"from_attributes": True}


class JudgeCreate(BaseModel):
    judge_code:      str        = Field(..., example="J009")
    name:            str        = Field(..., example="Justice Okafor")
    specialisations: List[str]  = Field(..., example=["Civil","Land"])
    court_location:  Optional[str] = None

    @field_validator("specialisations")
    def validate_specs(cls, v):
        for s in v:
            if s not in VALID_CASE_TYPES:
                raise ValueError(f"'{s}' is not a valid case type.")
        return v

class JudgeUpdate(BaseModel):
    name:            Optional[str]       = None
    specialisations: Optional[List[str]] = None
    is_available:    Optional[bool]      = None
    court_location:  Optional[str]       = None

class JudgeResponse(BaseModel):
    id:              str
    judge_code:      str
    name:            str
    specialisations: str
    is_available:    bool
    court_location:  Optional[str]
    created_at:      datetime
    model_config = {"from_attributes": True}


class CourtroomCreate(BaseModel):
    room_code: str     = Field(..., example="CR09")
    name:      str     = Field(..., example="Courtroom 9")
    capacity:  int     = Field(..., ge=2, le=100)
    location:  Optional[str] = None

class CourtroomUpdate(BaseModel):
    name:      Optional[str]  = None
    capacity:  Optional[int]  = None
    location:  Optional[str]  = None
    is_active: Optional[bool] = None

class CourtroomResponse(BaseModel):
    id:        str
    room_code: str
    name:      str
    capacity:  int
    location:  Optional[str]
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}


class CaseCreate(BaseModel):
    case_number:  str  = Field(..., example="CASE00042")
    case_type:    str  = Field(..., example="Criminal")
    num_parties:  int  = Field(..., ge=2, le=50)
    priority:     str  = Field(..., example="High")
    judge_id:     str
    courtroom_id: str
    description:  Optional[str] = None

    @field_validator("case_type")
    def validate_case_type(cls, v):
        if v not in VALID_CASE_TYPES:
            raise ValueError(f"case_type must be one of {VALID_CASE_TYPES}")
        return v

    @field_validator("priority")
    def validate_priority(cls, v):
        if v not in VALID_PRIORITIES:
            raise ValueError(f"priority must be one of {VALID_PRIORITIES}")
        return v

class CaseResponse(BaseModel):
    id:           str
    case_number:  str
    case_type:    str
    num_parties:  int
    priority:     str
    status:       str
    description:  Optional[str]
    judge_id:     Optional[str]
    courtroom_id: Optional[str]
    created_at:   datetime
    model_config = {"from_attributes": True}


class ScheduleRequest(BaseModel):
    case_id:        str
    proposed_start: datetime = Field(..., example="2025-09-01T09:00:00")

class ConfirmedResponse(BaseModel):
    status:                  str
    case_id:                 str
    case_type:               str
    judge_id:                str
    courtroom_id:            str
    start_time:              str
    end_time:                str
    predicted_duration_mins: int
    slot_id:                 str

class ConflictResponse(BaseModel):
    status:                  str
    case_id:                 str
    conflict_reason:         str
    queue_id:                str
    flagged_at:              str
    predicted_duration_mins: int


class TimetableResponse(BaseModel):
    id:            str
    case_id:       str
    judge_id:      str
    courtroom_id:  str
    start_time:    datetime
    end_time:      datetime
    duration_mins: int
    confirmed_at:  datetime
    model_config = {"from_attributes": True}

class PendingResponse(BaseModel):
    id:               str
    case_id:          str
    conflict_reason:  str
    flagged_at:       datetime
    admin_reviewed:   bool
    resolution_notes: Optional[str]
    model_config = {"from_attributes": True}

class ResolveRequest(BaseModel):
    resolution_notes: Optional[str] = None


class StatsResponse(BaseModel):
    total_cases:        int
    confirmed:          int
    conflicted:         int
    pending:            int
    conflict_rate_pct:  float
