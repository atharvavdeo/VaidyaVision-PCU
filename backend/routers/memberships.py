import sqlite3
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from ..core.database import get_db, row_to_dict, rows_to_list
from ..core.auth import get_current_user

router = APIRouter(prefix="/memberships", tags=["memberships"])


class CreateMembershipRequest(BaseModel):
    hospitalId: int
    membershipRole: str
    title: Optional[str] = None
    employeeCode: Optional[str] = None
    licenseNumber: Optional[str] = None
    departmentId: Optional[int] = None
    specialtyId: Optional[int] = None


class UpdateMembershipRequest(BaseModel):
    membershipId: int
    isPrimary: Optional[bool] = None
    status: Optional[str] = None


@router.get("")
def list_memberships(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    rows = db.execute(
        """SELECT hm.*, h.name as hospital_name, h.logo_url,
                  s.name as specialty_name, d.name as department_name
           FROM hospital_memberships hm
           JOIN hospitals h ON hm.hospital_id = h.id
           LEFT JOIN specialties s ON hm.specialty_id = s.id
           LEFT JOIN departments d ON hm.department_id = d.id
           WHERE hm.user_id = ?
           ORDER BY hm.is_primary DESC, hm.created_at DESC""",
        (current_user["id"],),
    ).fetchall()
    return {"memberships": rows_to_list(rows)}


@router.post("")
def create_membership(
    body: CreateMembershipRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    import datetime

    now = datetime.datetime.utcnow().isoformat()
    cursor = db.execute(
        """INSERT INTO hospital_memberships
           (user_id, hospital_id, membership_role, title, employee_code,
            license_number, department_id, specialty_id, status, is_primary, joined_at, created_at)
           VALUES (?,?,?,?,?,?,?,?,'active',0,?,?)""",
        (
            current_user["id"], body.hospitalId, body.membershipRole,
            body.title, body.employeeCode, body.licenseNumber,
            body.departmentId, body.specialtyId, now, now,
        ),
    )
    row = db.execute("SELECT * FROM hospital_memberships WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return {"membership": row_to_dict(row)}


@router.patch("")
def update_membership(
    body: UpdateMembershipRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    if body.isPrimary is not None:
        m = db.execute(
            "SELECT * FROM hospital_memberships WHERE id = ? AND user_id = ?",
            (body.membershipId, current_user["id"]),
        ).fetchone()
        if m:
            db.execute(
                "UPDATE hospital_memberships SET is_primary = 0 WHERE user_id = ? AND membership_role = ?",
                (current_user["id"], m["membership_role"]),
            )
            db.execute(
                "UPDATE hospital_memberships SET is_primary = ? WHERE id = ? AND user_id = ?",
                (1 if body.isPrimary else 0, body.membershipId, current_user["id"]),
            )
    if body.status is not None:
        db.execute(
            "UPDATE hospital_memberships SET status = ? WHERE id = ? AND user_id = ?",
            (body.status, body.membershipId, current_user["id"]),
        )
    return {"success": True}
