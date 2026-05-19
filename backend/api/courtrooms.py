"""
api/courtrooms.py
─────────────────
Courtroom endpoints — response mapped to frontend field expectations.
"""

from fastapi         import APIRouter, Depends, HTTPException
from sqlalchemy.orm  import Session
from typing          import List

from db.database     import get_db
from db.crud         import (get_all_courtrooms, get_courtroom_by_id,
                              get_courtroom_by_code, create_courtroom,
                              update_courtroom, delete_courtroom)
from core.security   import get_current_user

router = APIRouter(prefix="/api/courtrooms", tags=["Courtrooms"])


def _format_room(room):
    """Transform DB courtroom to match frontend field expectations."""
    return {
        "id":          room.id,
        "room_code":   room.room_code,
        "name":        room.name,
        "capacity":    room.capacity,
        "location":    room.location or "Main Building",
        "floor":       "",
        "facilities":  [],
        "is_active":   room.is_active,
        "created_at":  room.created_at.isoformat(),
    }


@router.get("", response_model=None, summary="List all courtrooms")
@router.get("/", response_model=None, summary="List all courtrooms", include_in_schema=False)
def list_courtrooms(db: Session = Depends(get_db)):
    return [_format_room(r) for r in get_all_courtrooms(db)]


@router.get("/{room_id}", response_model=None, summary="Get a courtroom by ID")
def get_courtroom(room_id: str, db: Session = Depends(get_db)):
    room = get_courtroom_by_id(db, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Courtroom not found.")
    return _format_room(room)


@router.post("", response_model=None, status_code=201, summary="Add a new courtroom")
@router.post("/", response_model=None, status_code=201, include_in_schema=False)
async def add_courtroom(request_data: dict,
                        db: Session = Depends(get_db),
                        current_user=Depends(get_current_user)):
    existing = get_all_courtrooms(db)
    code = f"CR{str(len(existing)+1).zfill(2)}"

    room = create_courtroom(
        db,
        room_code = request_data.get("room_code", code),
        name      = request_data.get("name",""),
        capacity  = int(request_data.get("capacity", 10)),
        location  = request_data.get("location",""),
    )
    return _format_room(room)


@router.put("/{room_id}", response_model=None, summary="Update courtroom")
@router.patch("/{room_id}", response_model=None, summary="Update courtroom", include_in_schema=False)
async def edit_courtroom(room_id: str,
                         request_data: dict,
                         db: Session = Depends(get_db),
                         current_user=Depends(get_current_user)):
    room = update_courtroom(db, room_id, **{
        k: v for k, v in request_data.items()
        if k in ["name","capacity","location","is_active"]
    })
    if not room:
        raise HTTPException(status_code=404, detail="Courtroom not found.")
    return _format_room(room)


@router.delete("/{room_id}", summary="Remove a courtroom")
def remove_courtroom(room_id: str,
                     db: Session = Depends(get_db),
                     current_user=Depends(get_current_user)):
    if not delete_courtroom(db, room_id):
        raise HTTPException(status_code=404, detail="Courtroom not found.")
    return {"message": "Courtroom deleted successfully."}