import sqlite3
from fastapi import APIRouter, Depends
from ..core.database import get_db, rows_to_list
from ..core.auth import get_current_user

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("/hospitals")
def get_patient_hospitals(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    rows = db.execute(
        """SELECT phl.*, h.name as hospital_name, h.logo_url, h.city, h.type
           FROM patient_hospital_links phl
           JOIN hospitals h ON h.id = phl.hospital_id
           WHERE phl.patient_id = ?
           ORDER BY phl.created_at DESC""",
        (current_user["id"],),
    ).fetchall()
    return {"hospitals": rows_to_list(rows)}
