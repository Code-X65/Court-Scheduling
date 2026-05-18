

from fastapi         import APIRouter, Depends, HTTPException
from sqlalchemy.orm  import Session
from typing          import List

from db.database     import get_db
from db.crud         import (get_all_courtrooms, get_courtroom_by_id,
                              get_courtroom_by_code, create_courtroom,
                              update_courtroom, delete_courtroom)
from core.security   import get_current_user
from schemas.schemas import CourtroomCreate, CourtroomUpdate, CourtroomResponse

router = APIRouter(prefix="/api/courtrooms", tags=["Courtrooms"])


@router.get("/", response_model=List[CourtroomResponse], summary="List all courtrooms")
def list_courtrooms(db: Session = Depends(get_db)):
    return get_all_courtrooms(db)


@router.get("/{room_id}", response_model=CourtroomResponse,
            summary="Get a courtroom by ID")
def get_courtroom(room_id: str, db: Session = Depends(get_db)):
    room = get_courtroom_by_id(db, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Courtroom not found.")
    return room


@router.post("/", response_model=CourtroomResponse, status_code=201,
             summary="Add a new courtroom")
def add_courtroom(payload: CourtroomCreate, db: Session = Depends(get_db),
                  current_user=Depends(get_current_user)):
    if get_courtroom_by_code(db, payload.room_code):
        raise HTTPException(status_code=409,
                            detail=f"Room code '{payload.room_code}' already exists.")
    return create_courtroom(db, payload.room_code, payload.name,
                            payload.capacity, payload.location)


@router.patch("/{room_id}", response_model=CourtroomResponse,
              summary="Update courtroom details or active status")
def edit_courtroom(room_id: str, payload: CourtroomUpdate,
                   db: Session = Depends(get_db),
                   current_user=Depends(get_current_user)):
    room = update_courtroom(db, room_id, **payload.model_dump(exclude_none=True))
    if not room:
        raise HTTPException(status_code=404, detail="Courtroom not found.")
    return room


@router.delete("/{room_id}", summary="Remove a courtroom")
def remove_courtroom(room_id: str, db: Session = Depends(get_db),
                     current_user=Depends(get_current_user)):
    if not delete_courtroom(db, room_id):
        raise HTTPException(status_code=404, detail="Courtroom not found.")
    return {"message": "Courtroom deleted successfully."}
