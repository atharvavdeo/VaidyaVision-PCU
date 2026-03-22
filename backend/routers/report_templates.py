import sqlite3
import datetime
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from ..core.database import get_db, row_to_dict, rows_to_list
from ..core.auth import get_current_user

router = APIRouter(prefix="/report-templates", tags=["report-templates"])


class CreateTemplateRequest(BaseModel):
    hospitalId: int
    name: str
    isDefault: Optional[bool] = False
    sectionSchemaJson: Optional[str] = None
    disclaimerText: Optional[str] = None


@router.get("")
def list_report_templates(
    hospitalId: int | None = None,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    if hospitalId is None:
        rows = db.execute(
            "SELECT * FROM hospital_report_templates WHERE is_active = 1 ORDER BY name ASC"
        ).fetchall()
    else:
        rows = db.execute(
            "SELECT * FROM hospital_report_templates WHERE is_active = 1 AND hospital_id = ? ORDER BY is_default DESC, name ASC",
            (hospitalId,),
        ).fetchall()
    return {"templates": rows_to_list(rows)}


@router.post("")
def create_report_template(
    body: CreateTemplateRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    now = datetime.datetime.utcnow().isoformat()
    cursor = db.execute(
        """INSERT INTO hospital_report_templates
           (hospital_id, name, version, is_default, is_active, section_schema_json, disclaimer_text, created_at, updated_at)
           VALUES (?, ?, 1, ?, 1, ?, ?, ?, ?)""",
        (
            body.hospitalId,
            body.name,
            1 if body.isDefault else 0,
            body.sectionSchemaJson,
            body.disclaimerText,
            now,
            now,
        ),
    )
    row = db.execute("SELECT * FROM hospital_report_templates WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return {"template": row_to_dict(row)}
