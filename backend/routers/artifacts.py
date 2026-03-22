import os
import sqlite3
import uuid
import datetime
from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
from ..core.database import get_db, row_to_dict
from ..core.auth import get_current_user

router = APIRouter(prefix="/artifacts", tags=["artifacts"])


@router.post("/upload")
async def upload_artifact(
    file: UploadFile = File(...),
    caseId: int = Form(...),
    artifactType: str = Form("other"),
    processingPipeline: str = Form("none"),
    modalityHint: str | None = Form(None),
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    case_row = db.execute("SELECT hospital_id, patient_id FROM cases WHERE id = ?", (caseId,)).fetchone()
    if not case_row:
        raise HTTPException(status_code=404, detail="Case not found")

    uploads_dir = os.path.join(os.getcwd(), "public", "uploads")
    os.makedirs(uploads_dir, exist_ok=True)

    ext = (file.filename or "bin").split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    path = os.path.join(uploads_dir, filename)
    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)

    now = datetime.datetime.utcnow().isoformat()
    membership = db.execute(
        "SELECT id FROM hospital_memberships WHERE user_id = ? AND hospital_id = ? AND status='active' LIMIT 1",
        (current_user["id"], case_row["hospital_id"]),
    ).fetchone()

    cursor = db.execute(
        """INSERT INTO case_artifacts
           (case_id, hospital_id, patient_id, uploaded_by_user_id, uploaded_by_membership_id,
            artifact_type, processing_pipeline, file_url, original_filename, mime_type,
            size_bytes, modality_hint, status, patient_visible, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'uploaded', 0, ?)""",
        (
            caseId,
            case_row["hospital_id"],
            case_row["patient_id"],
            current_user["id"],
            membership["id"] if membership else None,
            artifactType,
            processingPipeline,
            f"/public/uploads/{filename}",
            file.filename,
            file.content_type,
            len(content),
            modalityHint,
            now,
        ),
    )
    row = db.execute("SELECT * FROM case_artifacts WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return {"artifact": row_to_dict(row)}
