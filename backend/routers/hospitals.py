import sqlite3
from fastapi import APIRouter, Depends
from ..core.database import get_db, rows_to_list
from ..core.auth import get_current_user

router = APIRouter(prefix="/hospitals", tags=["hospitals"])


@router.get("")
def list_hospitals(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    rows = db.execute(
        """SELECT id, code, slug, name, type, city, state, phone, email, logo_url, is_active
           FROM hospitals
           WHERE is_active = 1
           ORDER BY name ASC"""
    ).fetchall()
    return {"hospitals": rows_to_list(rows)}


@router.get("/{hospital_id}/patients")
def list_hospital_patients(
    hospital_id: int,
    search: str = "",
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    sql = """
        SELECT u.id, u.name, u.email, u.age, u.gender, u.phone, u.image_url,
               phl.mrn, phl.status as link_status
        FROM patient_hospital_links phl
        JOIN users u ON phl.patient_id = u.id
        WHERE phl.hospital_id = ?
    """
    params = [hospital_id]
    if search:
        sql += " AND (u.name LIKE ? OR u.email LIKE ? OR phl.mrn LIKE ?)"
        like = f"%{search}%"
        params += [like, like, like]
    sql += " ORDER BY u.name ASC"
    rows = db.execute(sql, params).fetchall()
    return {"patients": rows_to_list(rows)}
