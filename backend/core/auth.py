import sqlite3
from fastapi import Depends, Header, HTTPException
from .database import get_db, row_to_dict


def _extract_clerk_id(authorization: str | None) -> str:
    # Transitional auth: accepts either raw clerk id in Bearer token or anonymous fallback for local dev.
    if not authorization:
        return "dev_clerk_user"
    token = authorization.replace("Bearer", "").strip()
    return token or "dev_clerk_user"


def get_current_user(
    authorization: str | None = Header(default=None),
    db: sqlite3.Connection = Depends(get_db),
):
    clerk_id = _extract_clerk_id(authorization)
    row = db.execute("SELECT * FROM users WHERE clerk_id = ?", (clerk_id,)).fetchone()
    if row:
        return row_to_dict(row)

    # Dev fallback: return first user to keep local migration workflows unblocked.
    first = db.execute("SELECT * FROM users ORDER BY id ASC LIMIT 1").fetchone()
    if not first:
        raise HTTPException(status_code=401, detail="No users found for auth context")
    return row_to_dict(first)


def get_hospital_staff(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in {"doctor", "pathologist", "hospital_admin", "admin"}:
        raise HTTPException(status_code=403, detail="Hospital staff access only")
    return current_user
