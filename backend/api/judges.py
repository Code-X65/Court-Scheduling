

from fastapi         import APIRouter, Depends, HTTPException
from sqlalchemy.orm  import Session
from typing          import List

from db.database     import get_db
from db.crud         import (get_all_judges, get_judge_by_id, get_judge_by_code,
                              create_judge, update_judge, delete_judge)
from core.security   import get_current_user
from schemas.schemas import JudgeCreate, JudgeUpdate, JudgeResponse

router = APIRouter(prefix="/api/judges", tags=["Judges"])


@router.get("/", response_model=List[JudgeResponse], summary="List all judges")
def list_judges(db: Session = Depends(get_db)):
    return get_all_judges(db)


@router.get("/{judge_id}", response_model=JudgeResponse, summary="Get a judge by ID")
def get_judge(judge_id: str, db: Session = Depends(get_db)):
    judge = get_judge_by_id(db, judge_id)
    if not judge:
        raise HTTPException(status_code=404, detail="Judge not found.")
    return judge


@router.post("/", response_model=JudgeResponse, status_code=201,
             summary="Add a new judge")
def add_judge(payload: JudgeCreate, db: Session = Depends(get_db),
              current_user=Depends(get_current_user)):
    if get_judge_by_code(db, payload.judge_code):
        raise HTTPException(status_code=409,
                            detail=f"Judge code '{payload.judge_code}' already exists.")
    return create_judge(db, payload.judge_code, payload.name,
                        payload.specialisations, payload.court_location)


@router.patch("/{judge_id}", response_model=JudgeResponse,
              summary="Update judge details or availability")
def edit_judge(judge_id: str, payload: JudgeUpdate,
               db: Session = Depends(get_db),
               current_user=Depends(get_current_user)):
    judge = update_judge(db, judge_id,
                         **payload.model_dump(exclude_none=True))
    if not judge:
        raise HTTPException(status_code=404, detail="Judge not found.")
    return judge


@router.delete("/{judge_id}", summary="Remove a judge")
def remove_judge(judge_id: str, db: Session = Depends(get_db),
                 current_user=Depends(get_current_user)):
    if not delete_judge(db, judge_id):
        raise HTTPException(status_code=404, detail="Judge not found.")
    return {"message": "Judge deleted successfully."}
