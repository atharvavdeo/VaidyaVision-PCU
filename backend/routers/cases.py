import sqlite3
import datetime
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from ..core.database import get_db, row_to_dict, rows_to_list
from ..core.auth import get_current_user

router = APIRouter(prefix="/cases", tags=["cases"])


class CreateCaseRequest(BaseModel):
    hospitalId: int
    patientId: int
    sourceRole: str = "doctor"
    title: Optional[str] = None
    presentingComplaint: Optional[str] = None
    primarySpecialtyId: Optional[int] = None
    priority: str = "medium"


class UpdateCaseRequest(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    internalSummary: Optional[str] = None
    title: Optional[str] = None


class CreateCaseAssignmentRequest(BaseModel):
    assignedToMembershipId: int
    assignmentType: str = "primary"
    reason: Optional[str] = None
    specialtyId: Optional[int] = None


class UpdateCaseAssignmentRequest(BaseModel):
    assignmentId: int
    status: str


class CreateCaseReportRequest(BaseModel):
    title: Optional[str] = None
    contentJson: Optional[str] = None
    templateId: Optional[int] = None


class SignCaseReportRequest(BaseModel):
    reportId: int
    htmlSnapshot: Optional[str] = None
    patientSummary: Optional[str] = None
    releasedMedicationsJson: Optional[str] = None


@router.get("")
def list_cases(current_user: dict = Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    if current_user["role"] == "patient":
        rows = db.execute(
            """SELECT c.*, h.name as hospital_name
               FROM cases c JOIN hospitals h ON h.id = c.hospital_id
               WHERE c.patient_id = ? AND c.patient_visibility_status = 'released'
               ORDER BY c.created_at DESC""",
            (current_user["id"],),
        ).fetchall()
    else:
        rows = db.execute(
            """SELECT c.*, h.name as hospital_name, p.name as patient_name
               FROM cases c
               JOIN hospitals h ON h.id = c.hospital_id
               JOIN users p ON p.id = c.patient_id
               ORDER BY c.created_at DESC"""
        ).fetchall()
    return {"cases": rows_to_list(rows)}


@router.post("")
def create_case(body: CreateCaseRequest, current_user: dict = Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    now = datetime.datetime.utcnow().isoformat()
    membership = db.execute(
        "SELECT id FROM hospital_memberships WHERE user_id = ? AND hospital_id = ? AND status = 'active' LIMIT 1",
        (current_user["id"], body.hospitalId),
    ).fetchone()
    cursor = db.execute(
        """INSERT INTO cases
           (hospital_id, patient_id, created_by_user_id, created_by_membership_id, source_role,
            primary_specialty_id, title, presenting_complaint, status, priority,
            patient_visibility_status, opened_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, 'hidden', ?, ?, ?)""",
        (
            body.hospitalId,
            body.patientId,
            current_user["id"],
            membership["id"] if membership else None,
            body.sourceRole,
            body.primarySpecialtyId,
            body.title,
            body.presentingComplaint,
            body.priority,
            now,
            now,
            now,
        ),
    )
    row = db.execute("SELECT * FROM cases WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return {"case": row_to_dict(row)}


@router.get("/{case_id}")
def get_case(case_id: int, current_user: dict = Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    row = db.execute("SELECT * FROM cases WHERE id = ?", (case_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Case not found")
    return {"case": row_to_dict(row)}


@router.patch("/{case_id}")
def update_case(case_id: int, body: UpdateCaseRequest, current_user: dict = Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    now = datetime.datetime.utcnow().isoformat()
    fields = ["updated_at = ?"]
    params: list[object] = [now]
    if body.status is not None:
        fields.append("status = ?")
        params.append(body.status)
    if body.priority is not None:
        fields.append("priority = ?")
        params.append(body.priority)
    if body.internalSummary is not None:
        fields.append("internal_summary = ?")
        params.append(body.internalSummary)
    if body.title is not None:
        fields.append("title = ?")
        params.append(body.title)
    params.append(case_id)
    db.execute(f"UPDATE cases SET {', '.join(fields)} WHERE id = ?", params)
    return {"success": True}


@router.get("/{case_id}/artifacts")
def list_case_artifacts(case_id: int, current_user: dict = Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    if current_user["role"] == "patient":
        rows = db.execute(
            "SELECT * FROM case_artifacts WHERE case_id = ? AND patient_id = ? AND patient_visible = 1 ORDER BY created_at DESC",
            (case_id, current_user["id"]),
        ).fetchall()
    else:
        rows = db.execute("SELECT * FROM case_artifacts WHERE case_id = ? ORDER BY created_at DESC", (case_id,)).fetchall()
    return {"artifacts": rows_to_list(rows)}


@router.get("/{case_id}/assignments")
def list_case_assignments(case_id: int, current_user: dict = Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute("SELECT * FROM case_assignments WHERE case_id = ? ORDER BY created_at DESC", (case_id,)).fetchall()
    return {"assignments": rows_to_list(rows)}


@router.post("/{case_id}/assignments")
def create_assignment(case_id: int, body: CreateCaseAssignmentRequest, current_user: dict = Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    now = datetime.datetime.utcnow().isoformat()
    cursor = db.execute(
        """INSERT INTO case_assignments
           (case_id, assigned_to_membership_id, assigned_by_user_id, specialty_id,
            assignment_type, reason, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)""",
        (case_id, body.assignedToMembershipId, current_user["id"], body.specialtyId, body.assignmentType, body.reason, now),
    )
    row = db.execute("SELECT * FROM case_assignments WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return {"assignment": row_to_dict(row)}


@router.patch("/{case_id}/assignments")
def update_assignment(case_id: int, body: UpdateCaseAssignmentRequest, current_user: dict = Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    now = datetime.datetime.utcnow().isoformat()
    accepted_at = now if body.status == "accepted" else None
    completed_at = now if body.status == "completed" else None
    db.execute(
        "UPDATE case_assignments SET status = ?, accepted_at = COALESCE(?, accepted_at), completed_at = COALESCE(?, completed_at) WHERE id = ?",
        (body.status, accepted_at, completed_at, body.assignmentId),
    )
    return {"success": True}


@router.get("/{case_id}/reports")
def list_case_reports(case_id: int, current_user: dict = Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute("SELECT * FROM case_reports WHERE case_id = ? ORDER BY created_at DESC", (case_id,)).fetchall()
    return {"reports": rows_to_list(rows)}


@router.post("/{case_id}/reports")
def create_case_report(case_id: int, body: CreateCaseReportRequest, current_user: dict = Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    now = datetime.datetime.utcnow().isoformat()
    case_row = db.execute("SELECT hospital_id FROM cases WHERE id = ?", (case_id,)).fetchone()
    if not case_row:
        raise HTTPException(status_code=404, detail="Case not found")
    membership = db.execute(
        "SELECT id FROM hospital_memberships WHERE user_id = ? AND hospital_id = ? AND status = 'active' LIMIT 1",
        (current_user["id"], case_row["hospital_id"]),
    ).fetchone()
    cursor = db.execute(
        """INSERT INTO case_reports
           (case_id, hospital_id, template_id, authored_by_user_id, authored_by_membership_id,
            status, title, content_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)""",
        (
            case_id,
            case_row["hospital_id"],
            body.templateId,
            current_user["id"],
            membership["id"] if membership else None,
            body.title,
            body.contentJson,
            now,
            now,
        ),
    )
    report_id = cursor.lastrowid
    db.execute(
        """INSERT INTO case_report_versions
           (report_id, version_number, edited_by_user_id, edited_by_membership_id, content_json, created_at)
           VALUES (?, 1, ?, ?, ?, ?)""",
        (report_id, current_user["id"], membership["id"] if membership else None, body.contentJson, now),
    )
    row = db.execute("SELECT * FROM case_reports WHERE id = ?", (report_id,)).fetchone()
    return {"report": row_to_dict(row)}


@router.patch("/{case_id}/reports")
def sign_case_report(case_id: int, body: SignCaseReportRequest, current_user: dict = Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    now = datetime.datetime.utcnow().isoformat()
    db.execute(
        """UPDATE case_reports
           SET status = 'signed', signed_at = ?, html_snapshot = ?, patient_summary = ?,
               released_medications_json = ?, updated_at = ?
           WHERE id = ? AND case_id = ?""",
        (now, body.htmlSnapshot, body.patientSummary, body.releasedMedicationsJson, now, body.reportId, case_id),
    )
    db.execute("UPDATE cases SET status = 'signed', updated_at = ? WHERE id = ?", (now, case_id))
    return {"success": True}
