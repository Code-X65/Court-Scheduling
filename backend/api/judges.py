"""
api/judges.py
─────────────
Judge management endpoints — response fields mapped to match frontend expectations.
"""

from fastapi         import APIRouter, Depends, HTTPException
from sqlalchemy.orm  import Session
from typing          import List, Optional

from db.database     import get_db
from db.crud         import (get_all_judges, get_judge_by_id, get_judge_by_code,
                              create_judge, update_judge, delete_judge)
from core.security   import get_current_user

router = APIRouter(prefix="/api/judges", tags=["Judges"])


def _format_judge(judge):
    """Transform DB judge object to match frontend field expectations."""
    specs = [s.strip() for s in judge.specialisations.split(",") if s.strip()]
    return {
        "id":                   judge.id,
        "judge_code":           judge.judge_code,
        "name":                 judge.name,
        "email":                f"{judge.judge_code.lower()}@court.gov.ng",
        "phone":                "",
        "rank":                 "High Court Judge",
        "gender":               "Male",
        "division":             judge.court_location or "Abuja",
        "specializations":      specs,          # array, not comma string
        "specialisations":      judge.specialisations,  # keep original too
        "available_days":       ["monday","tuesday","wednesday","thursday","friday"],
        "max_hearings_per_day": 4,
        "is_available":         judge.is_available,
        "is_active":            judge.is_available,
        "court_location":       judge.court_location,
        "created_at":           judge.created_at.isoformat(),
    }


@router.get("", response_model=None, summary="List all judges")
@router.get("/", response_model=None, summary="List all judges", include_in_schema=False)
def list_judges(db: Session = Depends(get_db)):
    return [_format_judge(j) for j in get_all_judges(db)]


@router.get("/{judge_id}", response_model=None, summary="Get a judge by ID")
def get_judge(judge_id: str, db: Session = Depends(get_db)):
    judge = get_judge_by_id(db, judge_id)
    if not judge:
        raise HTTPException(status_code=404, detail="Judge not found.")
    return _format_judge(judge)


@router.post("", response_model=None, status_code=201, summary="Add a new judge")
@router.post("/", response_model=None, status_code=201, include_in_schema=False)
async def add_judge(request_data: dict,
                    db: Session = Depends(get_db),
                    current_user=Depends(get_current_user)):
    # Accept both 'specializations' (array) and 'specialisations' (string)
    specs = request_data.get("specializations") or request_data.get("specialisations", [])
    if isinstance(specs, str):
        specs = [s.strip() for s in specs.split(",")]

    # Generate judge code
    existing = get_all_judges(db)
    code = f"J{str(len(existing)+1).zfill(3)}"

    if get_judge_by_code(db, code):
        code = f"J{str(len(existing)+100).zfill(3)}"

    judge = create_judge(
        db,
        judge_code     = code,
        name           = request_data.get("name",""),
        specialisations= specs,
        court_location = request_data.get("division") or request_data.get("court_location",""),
    )
    return _format_judge(judge)


@router.put("/{judge_id}", response_model=None, summary="Update judge")
@router.patch("/{judge_id}", response_model=None, summary="Update judge", include_in_schema=False)
async def edit_judge(judge_id: str,
                     request_data: dict,
                     db: Session = Depends(get_db),
                     current_user=Depends(get_current_user)):
    specs = request_data.get("specializations") or request_data.get("specialisations")
    if specs and isinstance(specs, list):
        request_data["specialisations"] = specs

    location = request_data.get("division") or request_data.get("court_location")
    if location:
        request_data["court_location"] = location

    # Map is_active → is_available
    if "is_active" in request_data:
        request_data["is_available"] = request_data.pop("is_active")

    judge = update_judge(db, judge_id, **{
        k: v for k, v in request_data.items()
        if k in ["name","specialisations","is_available","court_location"]
    })
    if not judge:
        raise HTTPException(status_code=404, detail="Judge not found.")
    return _format_judge(judge)


@router.delete("/{judge_id}", summary="Remove a judge")
def remove_judge(judge_id: str,
                 db: Session = Depends(get_db),
                 current_user=Depends(get_current_user)):
    if not delete_judge(db, judge_id):
        raise HTTPException(status_code=404, detail="Judge not found.")
    return {"message": "Judge deleted successfully."}