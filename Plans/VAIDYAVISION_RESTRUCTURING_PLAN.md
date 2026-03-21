# VaidyaVision — Full Repo Restructuring Plan
## Backend (FastAPI + Python) + Frontend (Next.js) Split

> **Key constraint respected:** Drizzle ORM stays in the **frontend** project because it is the single source of truth for the database schema and will be used to port the DB to PostgreSQL in the future. FastAPI accesses the same SQLite file directly via raw SQL / `sqlite3`, keeping full compatibility with the existing schema without any duplication.

---

## Table of Contents

1. [Overview & Philosophy](#1-overview--philosophy)
2. [Database Strategy — Why Drizzle Stays in Frontend](#2-database-strategy--why-drizzle-stays-in-frontend)
3. [Target Directory Structure](#3-target-directory-structure)
4. [Phase 1 — Backend Implementation](#4-phase-1--backend-implementation)
   - 4.1 core/config.py
   - 4.2 core/database.py (raw sqlite3, no ORM)
   - 4.3 core/auth.py (Clerk JWT)
   - 4.4 models/types.py (Pydantic response models only)
   - 4.5 Router implementation pattern
   - 4.6 All routers listed with complete examples
   - 4.7 main.py
   - 4.8 requirements.txt
5. [Phase 2 — Frontend Implementation](#5-phase-2--frontend-implementation)
   - 5.1 What stays exactly the same
   - 5.2 What gets removed
   - 5.3 lib/api/client.ts (new central fetch wrapper)
   - 5.4 Typed API client files
   - 5.5 URL replacement map (every file, every fetch call)
   - 5.6 next.config.mjs update
   - 5.7 package.json changes
   - 5.8 .env.local
6. [Phase 3 — File Migration Checklist](#6-phase-3--file-migration-checklist)
7. [Phase 4 — Implementation Order](#7-phase-4--implementation-order)
8. [Phase 5 — Running the New Setup](#8-phase-5--running-the-new-setup)
9. [Future: Porting to PostgreSQL](#9-future-porting-to-postgresql)

---

## 1. Overview & Philosophy

The goal is to split the monorepo into two top-level directories:

```
VaidyaVision/
├── backend/     ← Python FastAPI: ALL business logic, ML, OCR, RAG, auth verification
├── frontend/    ← Next.js: UI only + Drizzle schema (no business logic)
└── README.md
```

**Rules that must never be broken during this migration:**

- Zero UI/UX changes. Every page, component, and style stays pixel-identical.
- Zero feature regressions. Every API call that worked before must work after.
- Drizzle ORM remains in the frontend project as the canonical schema definition.
- FastAPI never imports Drizzle or TypeScript. It accesses the SQLite DB using Python's built-in `sqlite3` module with raw SQL queries that mirror the existing Drizzle queries exactly.
- The same physical SQLite file is used by both during development (`backend/data/vaidyavision.db`). The frontend's `drizzle.config.ts` simply points to this same file path.

---

## 2. Database Strategy — Why Drizzle Stays in Frontend

### The Problem with Replacing Drizzle

Drizzle is not just an ORM — it is the **migration engine and schema source of truth**. Replacing it with SQLAlchemy would mean:

- Duplicating the schema in two languages (TypeScript + Python)
- Losing the ability to run `npx drizzle-kit generate` and `npx drizzle-kit migrate` when porting to PostgreSQL
- Breaking the existing migration history

### The Solution: Shared SQLite File + Raw SQL in FastAPI

```
┌─────────────────────────────────────────────────────────┐
│                   Single SQLite File                     │
│             backend/data/vaidyavision.db                 │
└──────────────────┬──────────────────────────────────────┘
                   │
       ┌───────────┴────────────┐
       │                        │
┌──────▼───────┐        ┌───────▼──────┐
│   FastAPI    │        │  Next.js /   │
│  (Python     │        │  Drizzle ORM │
│  sqlite3)    │        │  (schema,    │
│  READ/WRITE  │        │  migrations) │
│  via raw SQL │        │              │
└──────────────┘        └──────────────┘
```

FastAPI uses Python's built-in `sqlite3` module. Every query is a raw SQL string that does exactly what the Drizzle query did. There is no ORM duplication.

### When Porting to PostgreSQL Later

1. Update `frontend/drizzle.config.ts` to point to PostgreSQL
2. Run `npx drizzle-kit generate` then `npx drizzle-kit migrate`
3. Update `backend/core/config.py` DATABASE_URL to PostgreSQL
4. Update `backend/core/database.py` to use `psycopg2` instead of `sqlite3`
5. The raw SQL queries in every router file stay **unchanged** (standard SQL works in both)

---

## 3. Target Directory Structure

```
VaidyaVision/
│
├── backend/
│   ├── main.py                          ← FastAPI app entry point
│   ├── requirements.txt
│   ├── .env.example
│   │
│   ├── data/
│   │   └── vaidyavision.db              ← Shared SQLite file (symlink or copy)
│   │
│   ├── public/
│   │   ├── uploads/                     ← Uploaded scan images
│   │   ├── heatmaps/                    ← GradCAM heatmap PNGs
│   │   └── uploads/
│   │       └── prescriptions/           ← Prescription images
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py                    ← All settings from env vars
│   │   ├── database.py                  ← sqlite3 connection + raw SQL helpers
│   │   └── auth.py                      ← Clerk JWT verification
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   └── types.py                     ← Pydantic request/response models only
│   │
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── users.py
│   │   ├── scans.py
│   │   ├── reports.py
│   │   ├── appointments.py
│   │   ├── conversations.py
│   │   ├── medications.py
│   │   ├── exercises.py
│   │   ├── notifications.py
│   │   ├── analytics.py
│   │   ├── family.py
│   │   ├── developer.py
│   │   ├── doctor.py
│   │   ├── ai.py
│   │   ├── communications.py
│   │   ├── followups.py
│   │   ├── voice_notes.py
│   │   └── ocr_routes.py
│   │
│   └── ml/                              ← Moved from ml-service/ (unchanged)
│       ├── inference.py
│       ├── model_defs.py
│       ├── ocr_service.py
│       ├── report_cleaner.py
│       ├── research_crawler.py
│       ├── research_embeddings.py
│       ├── research_rag.py
│       ├── server.py                    ← ML-specific FastAPI sub-app (reused)
│       ├── medical_ai_system_final.pth
│       ├── research_cache/
│       └── research_store/
│
└── frontend/
    ├── package.json                     ← Drizzle deps KEPT, DB deps removed
    ├── tsconfig.json
    ├── tailwind.config.ts               ← UNCHANGED
    ├── next.config.mjs                  ← Add static file proxy rewrites
    ├── middleware.ts                    ← UNCHANGED (Clerk routing only)
    ├── drizzle.config.ts                ← KEPT, updated DB path
    ├── .env.local.example
    │
    ├── app/                             ← ALL pages UNCHANGED (UI only)
    │   ├── layout.tsx                   ← UNCHANGED
    │   ├── globals.css                  ← UNCHANGED
    │   ├── not-found.tsx                ← UNCHANGED
    │   ├── (marketing)/                 ← UNCHANGED
    │   ├── sign-in/                     ← UNCHANGED
    │   ├── sign-up/                     ← UNCHANGED
    │   ├── onboarding/                  ← fetch URLs updated only
    │   ├── dashboard/                   ← fetch URLs updated only
    │   ├── doctor/                      ← fetch URLs updated only
    │   └── patient/                     ← fetch URLs updated only
    │
    ├── components/                      ← ALL components UNCHANGED (fetch URLs updated only)
    │
    ├── lib/
    │   ├── utils.ts                     ← UNCHANGED
    │   ├── db/                          ← KEPT (Drizzle schema + migrations)
    │   │   ├── schema.ts                ← UNCHANGED — canonical schema definition
    │   │   └── index.ts                 ← Updated path to shared DB file
    │   └── api/                         ← NEW: typed fetch wrappers
    │       ├── client.ts
    │       ├── users.ts
    │       ├── scans.ts
    │       ├── reports.ts
    │       ├── appointments.ts
    │       ├── conversations.ts
    │       ├── medications.ts
    │       ├── exercises.ts
    │       ├── notifications.ts
    │       ├── analytics.ts
    │       ├── family.ts
    │       ├── doctor.ts
    │       ├── ai.ts
    │       ├── communications.ts
    │       ├── ocr.ts
    │       ├── research.ts
    │       └── developer.ts
    │
    ├── drizzle/                         ← KEPT (migration files)
    │   └── 0000_sour_logan.sql
    │
    ├── scripts/
    │   └── seed.ts                      ← KEPT (uses Drizzle to seed)
    │
    └── public/
        ├── icons/                       ← UNCHANGED
        └── images/                      ← UNCHANGED
```

---

## 4. Phase 1 — Backend Implementation

### 4.1 `backend/core/config.py`

This is the single place all environment variables are read. Every other file imports from here.

```python
# backend/core/config.py
import os
from dataclasses import dataclass

@dataclass
class Settings:
    # Database — points to the shared SQLite file
    DATABASE_PATH: str = os.getenv("DATABASE_PATH", "./data/vaidyavision.db")

    # Clerk Auth
    CLERK_SECRET_KEY: str = os.getenv("CLERK_SECRET_KEY", "")
    CLERK_JWKS_URL: str = os.getenv(
        "CLERK_JWKS_URL",
        "https://api.clerk.dev/v1/jwks"
    )

    # External APIs
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER", "")
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    FIRECRAWL_API_KEY: str = os.getenv("FIRECRAWL_API_KEY", "")

    # App
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    APP_URL: str = os.getenv("APP_URL", "http://localhost:8000")
    ML_MODEL_PATH: str = os.getenv("ML_MODEL_PATH", "./ml/medical_ai_system_final.pth")
    UPLOADS_DIR: str = os.getenv("UPLOADS_DIR", "./public/uploads")
    HEATMAPS_DIR: str = os.getenv("HEATMAPS_DIR", "./public/heatmaps")


settings = Settings()
```

---

### 4.2 `backend/core/database.py`

Uses Python's built-in `sqlite3`. No ORM. Every query is raw SQL that matches what the Drizzle query was doing. The column names in queries use the **exact snake_case names from the SQLite schema** (e.g., `clerk_id`, `is_onboarded`, `image_url`).

```python
# backend/core/database.py
import sqlite3
from contextlib import contextmanager
from .config import settings


def get_connection() -> sqlite3.Connection:
    """
    Open a connection to the shared SQLite database.
    WAL mode and foreign keys match the existing Drizzle configuration.
    """
    conn = sqlite3.connect(settings.DATABASE_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row   # Rows behave like dicts: row["column_name"]
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def get_db():
    """
    FastAPI dependency — yields a DB connection and closes it when done.

    Usage in a router:
        from fastapi import Depends
        from ..core.database import get_db

        @router.get("/example")
        def example(db: sqlite3.Connection = Depends(get_db)):
            rows = db.execute("SELECT * FROM users").fetchall()
    """
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def row_to_dict(row: sqlite3.Row) -> dict:
    """Convert a sqlite3.Row to a plain Python dict."""
    return dict(row) if row else None


def rows_to_list(rows) -> list:
    """Convert a list of sqlite3.Row objects to a list of dicts."""
    return [dict(r) for r in rows]
```

---

### 4.3 `backend/core/auth.py`

Clerk issues signed JWTs. FastAPI verifies them using Clerk's public JWKS endpoint. No Clerk SDK needed — just PyJWT.

```python
# backend/core/auth.py
import sqlite3
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt import PyJWKClient
from .config import settings
from .database import get_db, row_to_dict

security = HTTPBearer()

# PyJWKClient caches the JWKS automatically
_jwks_client = PyJWKClient(settings.CLERK_JWKS_URL, cache_keys=True)


def verify_clerk_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """
    Verify the Clerk JWT and return the Clerk user ID (the 'sub' claim).
    Raises HTTP 401 if the token is invalid or expired.
    """
    token = credentials.credentials
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        clerk_id = payload.get("sub")
        if not clerk_id:
            raise HTTPException(status_code=401, detail="Invalid token: missing sub")
        return clerk_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized")


def get_current_user(
    clerk_id: str = Depends(verify_clerk_token),
    db: sqlite3.Connection = Depends(get_db),
) -> dict:
    """
    Resolve the Clerk ID to a user row in the database.
    Returns the full user row as a dict.
    Raises HTTP 404 if the user is not found.
    """
    row = db.execute(
        "SELECT * FROM users WHERE clerk_id = ?", (clerk_id,)
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return row_to_dict(row)


def get_doctor(current_user: dict = Depends(get_current_user)) -> dict:
    """Require the current user to have the 'doctor' role."""
    if current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Doctor access only")
    return current_user


def get_patient(current_user: dict = Depends(get_current_user)) -> dict:
    """Require the current user to have the 'patient' role."""
    if current_user["role"] != "patient":
        raise HTTPException(status_code=403, detail="Patient access only")
    return current_user
```

---

### 4.4 `backend/models/types.py`

These are **only** Pydantic request/response models. No schema duplication — the actual column definitions stay in Drizzle's `schema.ts`.

```python
# backend/models/types.py
from pydantic import BaseModel
from typing import Optional, List, Any


# ── Users ───────────────────────────────────────────────────────────

class SyncUserRequest(BaseModel):
    name: str
    email: str
    imageUrl: Optional[str] = None

class OnboardRequest(BaseModel):
    role: str  # doctor | patient | admin

class CreatePatientRequest(BaseModel):
    name: str
    email: str
    age: Optional[int] = None
    gender: Optional[str] = None
    bloodType: Optional[str] = None
    phone: Optional[str] = None
    medicalHistory: Optional[str] = None


# ── Scans ───────────────────────────────────────────────────────────

class UpdateScanRequest(BaseModel):
    status: Optional[str] = None
    doctorNotes: Optional[str] = None
    aiDiagnosis: Optional[str] = None
    aiConfidence: Optional[float] = None
    aiUncertainty: Optional[float] = None
    heatmapUrl: Optional[str] = None
    expertUsed: Optional[str] = None
    triageScore: Optional[int] = None


# ── Reports ─────────────────────────────────────────────────────────

class CreateReportRequest(BaseModel):
    scanId: int
    diagnosis: str
    findings: str
    recommendations: Optional[str] = None
    severity: Optional[str] = "moderate"


# ── Appointments ────────────────────────────────────────────────────

class CreateAppointmentRequest(BaseModel):
    doctorId: Optional[int] = None
    patientId: Optional[int] = None
    scheduledAt: str
    type: Optional[str] = "follow_up"
    notes: Optional[str] = None

class UpdateAppointmentRequest(BaseModel):
    appointmentId: int
    status: str


# ── Conversations ───────────────────────────────────────────────────

class CreateConversationRequest(BaseModel):
    otherUserId: int

class SendMessageRequest(BaseModel):
    content: str
    type: Optional[str] = "text"


# ── Medications ─────────────────────────────────────────────────────

class CreateMedicationRequest(BaseModel):
    patientId: Optional[int] = None
    drugName: str
    dosage: Optional[str] = None
    form: Optional[str] = None
    frequency: Optional[str] = None
    timeOfDay: Optional[List[str]] = None
    duration: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    instructions: Optional[str] = None
    prescriptionId: Optional[int] = None

class UpdateMedicationRequest(BaseModel):
    drugName: Optional[str] = None
    dosage: Optional[str] = None
    form: Optional[str] = None
    frequency: Optional[str] = None
    timeOfDay: Optional[List[str]] = None
    duration: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    instructions: Optional[str] = None
    isActive: Optional[bool] = None

class LogMedicationRequest(BaseModel):
    medicationId: int
    status: str  # taken | missed | skipped
    scheduledTime: Optional[str] = None
    notes: Optional[str] = None


# ── Exercises ───────────────────────────────────────────────────────

class CreateExerciseRequest(BaseModel):
    patientId: Optional[int] = None
    name: str
    type: Optional[str] = "other"
    description: Optional[str] = None
    frequency: Optional[str] = None
    durationMinutes: Optional[int] = None
    timeOfDay: Optional[str] = None
    daysOfWeek: Optional[List[str]] = None
    sets: Optional[int] = None
    reps: Optional[int] = None

class UpdateExerciseRequest(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    frequency: Optional[str] = None
    durationMinutes: Optional[int] = None
    timeOfDay: Optional[str] = None
    daysOfWeek: Optional[List[str]] = None
    sets: Optional[int] = None
    reps: Optional[int] = None
    isActive: Optional[bool] = None

class LogExerciseRequest(BaseModel):
    routineId: int
    status: str  # completed | partial | skipped
    durationMinutes: Optional[int] = None
    notes: Optional[str] = None


# ── Family ──────────────────────────────────────────────────────────

class CreateFamilyMemberRequest(BaseModel):
    name: str
    relation: str

class DeleteFamilyMemberRequest(BaseModel):
    memberId: int


# ── AI ──────────────────────────────────────────────────────────────

class ReportRequest(BaseModel):
    modality: str
    diagnosis: str
    findings: str
    language: str = "en"

class TreatmentRequest(BaseModel):
    age: Optional[str] = None
    sex: Optional[str] = None
    diagnosis: str
    findings: Optional[str] = None

class SuggestRequest(BaseModel):
    messages: List[Any]
    context: Optional[str] = None


# ── Communications ──────────────────────────────────────────────────

class EmailReportRequest(BaseModel):
    scanId: int

class CallReminderRequest(BaseModel):
    patientPhone: str
    patientName: Optional[str] = "Patient"
    appointmentTime: Optional[str] = "upcoming"


# ── Follow-ups ──────────────────────────────────────────────────────

class ScheduleFollowupRequest(BaseModel):
    scanId: int
    days: int
    type: Optional[str] = "email"


# ── Voice Notes ─────────────────────────────────────────────────────

class VoiceNoteRequest(BaseModel):
    scanId: int
    transcription: str


# ── Doctor Profile ──────────────────────────────────────────────────

class UpdateDoctorProfileRequest(BaseModel):
    specialty: Optional[str] = None
    degree: Optional[str] = None
    licenseNumber: Optional[str] = None
    experience: Optional[int] = None


# ── Developer API Keys ──────────────────────────────────────────────

class CreateApiKeyRequest(BaseModel):
    name: str
    environment: Optional[str] = "test"
    scopes: Optional[str] = "predict,ocr"
```

---

### 4.5 Router Implementation Pattern

Every router follows the same four-part pattern:

1. **Import** from `core.database`, `core.auth`, `models.types`
2. **Write raw SQL** that mirrors the original Drizzle query exactly
3. **Return** the result as a dict (matching the exact JSON shape the frontend expects)
4. **Never** import Drizzle, TypeScript, or SQLAlchemy

The column names in raw SQL always use the **actual DB column names** (snake_case, from `drizzle/0000_sour_logan.sql`), while the JSON response keys use **camelCase** (matching what the frontend currently receives).

---

### 4.6 All Routers — Complete Implementations

#### `backend/routers/users.py`

```python
# backend/routers/users.py
import sqlite3
import datetime
from fastapi import APIRouter, Depends, HTTPException
from ..core.database import get_db, row_to_dict, rows_to_list
from ..core.auth import verify_clerk_token, get_current_user
from ..models.types import SyncUserRequest, OnboardRequest, CreatePatientRequest

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    """Matches /api/users/me"""
    return {"user": current_user}


@router.post("/sync")
def sync_user(
    body: SyncUserRequest,
    clerk_id: str = Depends(verify_clerk_token),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/users/sync"""
    existing = db.execute(
        "SELECT * FROM users WHERE clerk_id = ?", (clerk_id,)
    ).fetchone()

    if existing:
        db.execute(
            """UPDATE users SET name = ?, email = ?, image_url = ?
               WHERE clerk_id = ?""",
            (
                body.name or existing["name"],
                body.email or existing["email"],
                body.imageUrl or existing["image_url"],
                clerk_id,
            ),
        )
        return {"id": existing["id"], "updated": True}

    now = datetime.datetime.utcnow().isoformat()
    cursor = db.execute(
        """INSERT INTO users (clerk_id, role, name, email, image_url, is_onboarded, created_at)
           VALUES (?, 'patient', ?, ?, ?, 0, ?)""",
        (clerk_id, body.name or "Anonymous User", body.email or "", body.imageUrl, now),
    )
    return {"id": cursor.lastrowid, "created": True}


@router.post("/onboard")
def onboard_user(
    body: OnboardRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/users/onboard"""
    if body.role not in ["doctor", "patient", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    if current_user["is_onboarded"]:
        raise HTTPException(status_code=409, detail="Already onboarded")

    db.execute(
        "UPDATE users SET role = ?, is_onboarded = 1 WHERE id = ?",
        (body.role, current_user["id"]),
    )
    return {"success": True, "role": body.role}


@router.get("/patients")
def list_patients(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/users/patients GET"""
    if current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Doctor access only")
    rows = db.execute(
        """SELECT id, name, email, image_url, age, gender, blood_type, phone,
                  medical_history, created_at
           FROM users WHERE role = 'patient'"""
    ).fetchall()
    return {"patients": rows_to_list(rows)}


@router.post("/patients", status_code=201)
def create_patient(
    body: CreatePatientRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/users/patients POST"""
    if current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Doctor access only")

    existing = db.execute(
        "SELECT id FROM users WHERE email = ?", (body.email,)
    ).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail="Email already exists")

    now = datetime.datetime.utcnow().isoformat()
    fake_clerk_id = f"doctor_added_{int(datetime.datetime.utcnow().timestamp() * 1000)}"
    cursor = db.execute(
        """INSERT INTO users
           (clerk_id, role, name, email, age, gender, blood_type, phone,
            medical_history, is_onboarded, created_at)
           VALUES (?, 'patient', ?, ?, ?, ?, ?, ?, ?, 1, ?)""",
        (
            fake_clerk_id, body.name, body.email, body.age, body.gender,
            body.bloodType, body.phone, body.medicalHistory, now,
        ),
    )
    patient = db.execute(
        "SELECT * FROM users WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()
    return {"patient": row_to_dict(patient)}
```

---

#### `backend/routers/scans.py`

```python
# backend/routers/scans.py
import sqlite3
import os
import uuid
import base64
import time
import datetime
import sys
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from ..core.database import get_db, row_to_dict, rows_to_list
from ..core.auth import get_current_user, get_doctor
from ..core.config import settings
from ..models.types import UpdateScanRequest

router = APIRouter(prefix="/scans", tags=["scans"])

# Lazy-load ML inference to avoid startup crash if model file missing
_ml_loaded = False

def _ensure_ml():
    global _ml_loaded
    if not _ml_loaded:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "ml"))
        from inference import load_models
        if os.path.isfile(settings.ML_MODEL_PATH):
            load_models(settings.ML_MODEL_PATH)
        _ml_loaded = True


@router.get("")
def list_scans(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/scans GET"""
    if current_user["role"] == "doctor":
        sql = """
            SELECT s.*, u.name as patient_name, u.email as patient_email
            FROM scans s LEFT JOIN users u ON s.patient_id = u.id
        """
        params = []
        if status:
            sql += " WHERE s.status = ?"
            params.append(status)
        sql += " ORDER BY s.uploaded_at DESC"
        rows = db.execute(sql, params).fetchall()
    else:
        sql = "SELECT * FROM scans WHERE patient_id = ?"
        params = [current_user["id"]]
        if status:
            sql += " AND status = ?"
            params.append(status)
        sql += " ORDER BY uploaded_at DESC"
        rows = db.execute(sql, params).fetchall()

    return {"scans": rows_to_list(rows)}


@router.get("/{scan_id}")
def get_scan(
    scan_id: int,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/scans/[id] GET"""
    row = db.execute(
        """SELECT s.*,
                  p.name as patient_name, p.email as patient_email,
                  d.name as doctor_name
           FROM scans s
           LEFT JOIN users p ON s.patient_id = p.id
           LEFT JOIN users d ON s.doctor_id = d.id
           WHERE s.id = ?""",
        (scan_id,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Scan not found")
    return {"scan": row_to_dict(row)}


@router.patch("/{scan_id}")
def update_scan(
    scan_id: int,
    body: UpdateScanRequest,
    current_user: dict = Depends(get_doctor),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/scans/[id] PATCH"""
    scan = db.execute("SELECT id FROM scans WHERE id = ?", (scan_id,)).fetchone()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    fields = []
    values = []
    field_map = {
        "status": "status",
        "doctorNotes": "doctor_notes",
        "aiDiagnosis": "ai_diagnosis",
        "aiConfidence": "ai_confidence",
        "aiUncertainty": "ai_uncertainty",
        "heatmapUrl": "heatmap_url",
        "expertUsed": "expert_used",
        "triageScore": "triage_score",
    }
    for py_field, db_col in field_map.items():
        val = getattr(body, py_field, None)
        if val is not None:
            fields.append(f"{db_col} = ?")
            values.append(val)

    fields.append("doctor_id = ?")
    values.append(current_user["id"])
    fields.append("reviewed_at = ?")
    values.append(datetime.datetime.utcnow().isoformat())
    values.append(scan_id)

    db.execute(f"UPDATE scans SET {', '.join(fields)} WHERE id = ?", values)
    return {"success": True, "scanId": scan_id}


@router.post("/upload")
async def upload_scan(
    file: UploadFile = File(...),
    modality: str = Form(...),
    symptoms: Optional[str] = Form(None),
    patientId: Optional[int] = Form(None),
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/upload POST"""
    if modality not in ["brain", "lung", "skin", "ecg"]:
        raise HTTPException(status_code=400, detail="Invalid modality")

    # Determine target patient
    target_patient_id = current_user["id"]
    if patientId and current_user["role"] == "doctor":
        patient = db.execute(
            "SELECT id FROM users WHERE id = ? AND role = 'patient'", (patientId,)
        ).fetchone()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        target_patient_id = patientId

    # Save file
    os.makedirs(settings.UPLOADS_DIR, exist_ok=True)
    ext = (file.filename or "jpg").split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join(settings.UPLOADS_DIR, filename)

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    image_url = f"/public/uploads/{filename}"
    now = datetime.datetime.utcnow().isoformat()

    # Insert scan record with status=processing
    cursor = db.execute(
        """INSERT INTO scans
           (patient_id, image_url, modality, status, symptoms, original_filename, uploaded_at)
           VALUES (?, ?, ?, 'processing', ?, ?, ?)""",
        (target_patient_id, image_url, modality, symptoms, file.filename, now),
    )
    scan_id = cursor.lastrowid

    # Run ML inference
    try:
        _ensure_ml()
        from ml.inference import predict as run_ml_inference

        ml_result = run_ml_inference(
            image_bytes=contents,
            force_modality=modality,
            mc_samples=25,
            uncertainty_threshold=0.15,
        )

        heatmap_url = None
        if ml_result.get("heatmap_base64"):
            os.makedirs(settings.HEATMAPS_DIR, exist_ok=True)
            hm_filename = f"heatmap_{int(time.time() * 1000)}.png"
            hm_path = os.path.join(settings.HEATMAPS_DIR, hm_filename)
            with open(hm_path, "wb") as hf:
                hf.write(base64.b64decode(ml_result["heatmap_base64"]))
            heatmap_url = f"/public/heatmaps/{hm_filename}"

        if ml_result.get("status") == "ACCEPTED":
            ts = ml_result.get("triage_score", 0) or 0
            priority = (
                "critical" if ts >= 80
                else "high" if ts >= 60
                else "medium" if ts >= 40
                else "low"
            )
            db.execute(
                """UPDATE scans SET
                   status = 'completed', ai_diagnosis = ?, ai_confidence = ?,
                   ai_uncertainty = ?, heatmap_url = ?, expert_used = ?,
                   triage_score = ?, priority = ?
                   WHERE id = ?""",
                (
                    ml_result.get("diagnosis"), ml_result.get("confidence"),
                    ml_result.get("uncertainty"), heatmap_url,
                    ml_result.get("modality"), ts, priority, scan_id,
                ),
            )
        else:
            db.execute("UPDATE scans SET status = 'pending' WHERE id = ?", (scan_id,))

        # Notifications
        _create_scan_notifications(db, scan_id, target_patient_id, modality,
                                   ml_result.get("diagnosis", ""), ml_result.get("status"))

    except Exception:
        db.execute("UPDATE scans SET status = 'pending' WHERE id = ?", (scan_id,))

    scan = db.execute("SELECT * FROM scans WHERE id = ?", (scan_id,)).fetchone()
    s = row_to_dict(scan)
    return {
        "scanId": s["id"],
        "imageUrl": s["image_url"],
        "aiDiagnosis": s["ai_diagnosis"],
        "confidence": s["ai_confidence"],
        "heatmapUrl": s["heatmap_url"],
        "status": s["status"],
    }


def _create_scan_notifications(db, scan_id, patient_id, modality, diagnosis, ml_status):
    now = datetime.datetime.utcnow().isoformat()
    db.execute(
        """INSERT INTO notifications (user_id, type, message, link, is_read, created_at)
           VALUES (?, 'scan_completed', ?, ?, 0, ?)""",
        (
            patient_id,
            f"Your {modality} scan analysis is complete: {diagnosis or 'Review needed'}",
            f"/patient/scans/{scan_id}",
            now,
        ),
    )
    doctors = db.execute(
        "SELECT id FROM users WHERE role = 'doctor'"
    ).fetchall()
    for doc in doctors:
        db.execute(
            """INSERT INTO notifications (user_id, type, message, link, is_read, created_at)
               VALUES (?, 'scan_ready', ?, ?, 0, ?)""",
            (
                doc["id"],
                f"New {modality} scan uploaded and analyzed.",
                f"/doctor/scan/{scan_id}",
                now,
            ),
        )
```

---

#### `backend/routers/reports.py`

```python
# backend/routers/reports.py
import sqlite3
import datetime
from fastapi import APIRouter, Depends, HTTPException
from ..core.database import get_db, row_to_dict, rows_to_list
from ..core.auth import get_current_user, get_doctor
from ..models.types import CreateReportRequest

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("")
def list_reports(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/reports GET"""
    if current_user["role"] == "doctor":
        rows = db.execute(
            """SELECT r.*,
                      s.modality, s.image_url, s.heatmap_url, s.ai_diagnosis, s.ai_confidence,
                      p.name as patient_name, p.email as patient_email,
                      d.name as doctor_name, d.specialty as doctor_specialty
               FROM reports r
               LEFT JOIN scans s ON r.scan_id = s.id
               LEFT JOIN users p ON r.patient_id = p.id
               LEFT JOIN users d ON r.doctor_id = d.id
               WHERE r.doctor_id = ?
               ORDER BY r.created_at DESC""",
            (current_user["id"],),
        ).fetchall()
    else:
        rows = db.execute(
            """SELECT r.*,
                      s.modality, s.image_url, s.heatmap_url,
                      d.name as doctor_name, d.specialty as doctor_specialty
               FROM reports r
               LEFT JOIN scans s ON r.scan_id = s.id
               LEFT JOIN users d ON r.doctor_id = d.id
               WHERE r.patient_id = ?
               ORDER BY r.created_at DESC""",
            (current_user["id"],),
        ).fetchall()
    return {"reports": rows_to_list(rows)}


@router.get("/{report_id}")
def get_report(
    report_id: int,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/reports/[id] GET"""
    row = db.execute(
        """SELECT r.*,
                  s.modality, s.image_url, s.heatmap_url, s.ai_diagnosis, s.ai_confidence,
                  p.name as patient_name, p.email as patient_email, p.age as patient_age,
                  d.name as doctor_name, d.specialty as doctor_specialty, d.email as doctor_email
           FROM reports r
           LEFT JOIN scans s ON r.scan_id = s.id
           LEFT JOIN users p ON r.patient_id = p.id
           LEFT JOIN users d ON r.doctor_id = d.id
           WHERE r.id = ?""",
        (report_id,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Report not found")
    report = row_to_dict(row)
    if current_user["role"] == "patient" and report["patient_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return {"report": report}


@router.post("")
def create_report(
    body: CreateReportRequest,
    current_user: dict = Depends(get_doctor),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/reports POST"""
    scan = db.execute(
        "SELECT patient_id FROM scans WHERE id = ?", (body.scanId,)
    ).fetchone()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    now = datetime.datetime.utcnow().isoformat()
    cursor = db.execute(
        """INSERT INTO reports
           (scan_id, patient_id, doctor_id, diagnosis, findings,
            recommendations, severity, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'signed', ?)""",
        (
            body.scanId, scan["patient_id"], current_user["id"],
            body.diagnosis, body.findings,
            body.recommendations, body.severity or "moderate", now,
        ),
    )
    db.execute(
        "UPDATE scans SET status = 'completed', doctor_id = ?, reviewed_at = ? WHERE id = ?",
        (current_user["id"], now, body.scanId),
    )
    report = db.execute(
        "SELECT * FROM reports WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()
    return {"report": row_to_dict(report)}
```

---

#### `backend/routers/appointments.py`

```python
# backend/routers/appointments.py
import sqlite3
import datetime
from fastapi import APIRouter, Depends, HTTPException
from ..core.database import get_db, row_to_dict, rows_to_list
from ..core.auth import get_current_user
from ..models.types import CreateAppointmentRequest, UpdateAppointmentRequest

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.get("")
def list_appointments(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/appointments GET"""
    if current_user["role"] == "doctor":
        col = "doctor_id"
    else:
        col = "patient_id"

    rows = db.execute(
        f"""SELECT a.*,
                   p.name as patient_name, p.image_url as patient_image_url,
                   d.name as doctor_name, d.image_url as doctor_image_url
            FROM appointments a
            LEFT JOIN users p ON a.patient_id = p.id
            LEFT JOIN users d ON a.doctor_id = d.id
            WHERE a.{col} = ?
            ORDER BY a.scheduled_at DESC""",
        (current_user["id"],),
    ).fetchall()
    return {"appointments": rows_to_list(rows)}


@router.post("")
def create_appointment(
    body: CreateAppointmentRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/appointments POST"""
    patient_id = current_user["id"] if current_user["role"] == "patient" else body.patientId
    doctor_id = current_user["id"] if current_user["role"] == "doctor" else body.doctorId

    if not patient_id or not doctor_id or not body.scheduledAt:
        raise HTTPException(status_code=400, detail="patientId, doctorId, scheduledAt required")

    now = datetime.datetime.utcnow().isoformat()
    cursor = db.execute(
        """INSERT INTO appointments
           (patient_id, doctor_id, scheduled_at, type, notes, status, created_at)
           VALUES (?, ?, ?, ?, ?, 'scheduled', ?)""",
        (patient_id, doctor_id, body.scheduledAt, body.type or "follow_up", body.notes, now),
    )
    recipient_id = patient_id if current_user["id"] == doctor_id else doctor_id
    db.execute(
        """INSERT INTO notifications (user_id, type, message, link, is_read, created_at)
           VALUES (?, 'appointment_scheduled', ?, ?, 0, ?)""",
        (
            recipient_id,
            f"New appointment scheduled by {current_user['name']}",
            "/patient/appointments" if current_user["role"] == "doctor" else "/doctor/appointments",
            now,
        ),
    )
    appt = db.execute(
        "SELECT * FROM appointments WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()
    return {"appointment": row_to_dict(appt)}


@router.patch("")
def update_appointment(
    body: UpdateAppointmentRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/appointments PATCH"""
    db.execute(
        "UPDATE appointments SET status = ? WHERE id = ?",
        (body.status, body.appointmentId),
    )
    return {"success": True}
```

---

#### `backend/routers/conversations.py`

```python
# backend/routers/conversations.py
import sqlite3
import datetime
from fastapi import APIRouter, Depends, HTTPException
from ..core.database import get_db, row_to_dict, rows_to_list
from ..core.auth import get_current_user
from ..models.types import CreateConversationRequest, SendMessageRequest

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("")
def list_conversations(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/conversations GET"""
    uid = current_user["id"]
    rows = db.execute(
        """SELECT c.*,
                  p.name as patient_name, p.image_url as patient_image_url,
                  d.name as doctor_name, d.image_url as doctor_image_url
           FROM conversations c
           LEFT JOIN users p ON c.patient_id = p.id
           LEFT JOIN users d ON c.doctor_id = d.id
           WHERE c.patient_id = ? OR c.doctor_id = ?
           ORDER BY c.last_message_at DESC""",
        (uid, uid),
    ).fetchall()

    result = []
    for row in rows:
        conv = row_to_dict(row)
        last_msg = db.execute(
            """SELECT content, created_at FROM messages
               WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1""",
            (conv["id"],),
        ).fetchone()
        conv["messages"] = [row_to_dict(last_msg)] if last_msg else []
        result.append(conv)

    return {"conversations": result}


@router.post("")
def create_or_find_conversation(
    body: CreateConversationRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/conversations POST"""
    patient_id = current_user["id"] if current_user["role"] == "patient" else body.otherUserId
    doctor_id = current_user["id"] if current_user["role"] == "doctor" else body.otherUserId

    existing = db.execute(
        "SELECT * FROM conversations WHERE patient_id = ? AND doctor_id = ?",
        (patient_id, doctor_id),
    ).fetchone()
    if existing:
        return {"conversation": row_to_dict(existing)}

    now = datetime.datetime.utcnow().isoformat()
    cursor = db.execute(
        "INSERT INTO conversations (patient_id, doctor_id, created_at) VALUES (?, ?, ?)",
        (patient_id, doctor_id, now),
    )
    conv = db.execute(
        "SELECT * FROM conversations WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()
    return {"conversation": row_to_dict(conv)}


@router.get("/{conversation_id}/messages")
def get_messages(
    conversation_id: int,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/conversations/[id]/messages GET"""
    rows = db.execute(
        """SELECT m.*, u.name as sender_name, u.image_url as sender_image_url, u.role as sender_role
           FROM messages m LEFT JOIN users u ON m.sender_id = u.id
           WHERE m.conversation_id = ?
           ORDER BY m.created_at ASC""",
        (conversation_id,),
    ).fetchall()
    return {"messages": rows_to_list(rows)}


@router.post("/{conversation_id}/messages")
def send_message(
    conversation_id: int,
    body: SendMessageRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/conversations/[id]/messages POST"""
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="Content required")

    now = datetime.datetime.utcnow().isoformat()
    cursor = db.execute(
        """INSERT INTO messages (conversation_id, sender_id, content, type, created_at)
           VALUES (?, ?, ?, ?, ?)""",
        (conversation_id, current_user["id"], body.content.strip(), body.type or "text", now),
    )
    db.execute(
        "UPDATE conversations SET last_message_at = ? WHERE id = ?",
        (now, conversation_id),
    )
    conv = db.execute(
        "SELECT * FROM conversations WHERE id = ?", (conversation_id,)
    ).fetchone()
    if conv:
        conv = row_to_dict(conv)
        recipient_id = conv["patient_id"] if current_user["id"] == conv["doctor_id"] else conv["doctor_id"]
        db.execute(
            """INSERT INTO notifications (user_id, type, message, link, is_read, created_at)
               VALUES (?, 'message_received', ?, ?, 0, ?)""",
            (
                recipient_id,
                f"New message from {current_user['name']}",
                f"/doctor/messages?chat={conversation_id}",
                now,
            ),
        )
    msg = db.execute("SELECT * FROM messages WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return {"message": row_to_dict(msg)}
```

---

#### `backend/routers/medications.py`

```python
# backend/routers/medications.py
import sqlite3
import json
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from ..core.database import get_db, row_to_dict, rows_to_list
from ..core.auth import get_current_user
from ..models.types import CreateMedicationRequest, UpdateMedicationRequest, LogMedicationRequest

router = APIRouter(prefix="/medications", tags=["medications"])


@router.get("")
def list_medications(
    patientId: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/medications GET"""
    target = patientId if (current_user["role"] == "doctor" and patientId) else current_user["id"]
    meds = rows_to_list(db.execute(
        "SELECT * FROM medications WHERE patient_id = ? ORDER BY created_at DESC",
        (target,),
    ).fetchall())
    today = datetime.date.today().isoformat()
    logs = rows_to_list(db.execute(
        "SELECT * FROM medication_logs WHERE patient_id = ? AND log_date = ?",
        (target, today),
    ).fetchall())
    return {"medications": meds, "todayLogs": logs}


@router.post("")
def create_medication(
    body: CreateMedicationRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/medications POST"""
    target = (body.patientId or current_user["id"]) if current_user["role"] == "doctor" else current_user["id"]
    added_by = "doctor" if current_user["role"] == "doctor" else "patient"
    doctor_id = current_user["id"] if current_user["role"] == "doctor" else None
    now = datetime.datetime.utcnow().isoformat()
    cursor = db.execute(
        """INSERT INTO medications
           (patient_id, doctor_id, prescription_id, drug_name, dosage, form,
            frequency, time_of_day, duration, start_date, end_date,
            instructions, added_by, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            target, doctor_id, body.prescriptionId, body.drugName, body.dosage,
            body.form, body.frequency,
            json.dumps(body.timeOfDay) if body.timeOfDay else None,
            body.duration,
            body.startDate or datetime.date.today().isoformat(),
            body.endDate, body.instructions, added_by, now, now,
        ),
    )
    med = db.execute("SELECT * FROM medications WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return {"success": True, "medication": row_to_dict(med)}


@router.patch("/{med_id}")
def update_medication(
    med_id: int,
    body: UpdateMedicationRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/medications/[id] PATCH"""
    fields, values = [], []
    field_map = {
        "drugName": "drug_name", "dosage": "dosage", "form": "form",
        "frequency": "frequency", "duration": "duration", "startDate": "start_date",
        "endDate": "end_date", "instructions": "instructions", "isActive": "is_active",
    }
    for py_f, db_col in field_map.items():
        val = getattr(body, py_f, None)
        if val is not None:
            fields.append(f"{db_col} = ?")
            values.append(val)
    if body.timeOfDay is not None:
        fields.append("time_of_day = ?")
        values.append(json.dumps(body.timeOfDay))
    fields.append("updated_at = ?")
    values.append(datetime.datetime.utcnow().isoformat())
    values.append(med_id)
    db.execute(f"UPDATE medications SET {', '.join(fields)} WHERE id = ?", values)
    return {"success": True}


@router.delete("/{med_id}")
def delete_medication(
    med_id: int,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/medications/[id] DELETE"""
    db.execute("DELETE FROM medications WHERE id = ?", (med_id,))
    return {"success": True}


@router.post("/log")
def log_medication(
    body: LogMedicationRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/medications/log POST"""
    today = datetime.date.today().isoformat()
    now = datetime.datetime.utcnow().isoformat()
    existing = db.execute(
        """SELECT id FROM medication_logs
           WHERE medication_id = ? AND log_date = ? AND scheduled_time = ?""",
        (body.medicationId, today, body.scheduledTime or ""),
    ).fetchone()

    taken_at = now if body.status == "taken" else None
    if existing:
        db.execute(
            "UPDATE medication_logs SET status = ?, taken_at = ?, notes = ? WHERE id = ?",
            (body.status, taken_at, body.notes, existing["id"]),
        )
        return {"success": True, "updated": True}

    cursor = db.execute(
        """INSERT INTO medication_logs
           (medication_id, patient_id, status, scheduled_time, taken_at, notes, log_date, created_at)
           VALUES (?,?,?,?,?,?,?,?)""",
        (body.medicationId, current_user["id"], body.status,
         body.scheduledTime, taken_at, body.notes, today, now),
    )
    log = db.execute("SELECT * FROM medication_logs WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return {"success": True, "log": row_to_dict(log)}
```

---

#### `backend/routers/exercises.py`

```python
# backend/routers/exercises.py
import sqlite3
import json
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from ..core.database import get_db, row_to_dict, rows_to_list
from ..core.auth import get_current_user
from ..models.types import CreateExerciseRequest, UpdateExerciseRequest, LogExerciseRequest

router = APIRouter(prefix="/exercises", tags=["exercises"])


@router.get("")
def list_exercises(
    patientId: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/exercises GET"""
    target = patientId if (current_user["role"] == "doctor" and patientId) else current_user["id"]
    routines = rows_to_list(db.execute(
        "SELECT * FROM exercise_routines WHERE patient_id = ? ORDER BY created_at DESC",
        (target,),
    ).fetchall())
    today = datetime.date.today().isoformat()
    today_logs = rows_to_list(db.execute(
        "SELECT * FROM exercise_logs WHERE patient_id = ? AND log_date = ?",
        (target, today),
    ).fetchall())
    return {"routines": routines, "todayLogs": today_logs}


@router.post("")
def create_exercise(
    body: CreateExerciseRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/exercises POST"""
    target = (body.patientId or current_user["id"]) if current_user["role"] == "doctor" else current_user["id"]
    added_by = "doctor" if current_user["role"] == "doctor" else "patient"
    doctor_id = current_user["id"] if current_user["role"] == "doctor" else None
    now = datetime.datetime.utcnow().isoformat()
    cursor = db.execute(
        """INSERT INTO exercise_routines
           (patient_id, doctor_id, name, type, description, frequency,
            duration_minutes, time_of_day, days_of_week, sets, reps, added_by, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            target, doctor_id, body.name, body.type or "other", body.description,
            body.frequency, body.durationMinutes, body.timeOfDay,
            json.dumps(body.daysOfWeek) if body.daysOfWeek else None,
            body.sets, body.reps, added_by, now,
        ),
    )
    routine = db.execute("SELECT * FROM exercise_routines WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return {"success": True, "routine": row_to_dict(routine)}


@router.patch("/{routine_id}")
def update_exercise(
    routine_id: int,
    body: UpdateExerciseRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/exercises/[id] PATCH"""
    fields, values = [], []
    simple = {
        "name": "name", "type": "type", "description": "description",
        "frequency": "frequency", "durationMinutes": "duration_minutes",
        "timeOfDay": "time_of_day", "sets": "sets", "reps": "reps", "isActive": "is_active",
    }
    for py_f, db_col in simple.items():
        val = getattr(body, py_f, None)
        if val is not None:
            fields.append(f"{db_col} = ?")
            values.append(val)
    if body.daysOfWeek is not None:
        fields.append("days_of_week = ?")
        values.append(json.dumps(body.daysOfWeek))
    values.append(routine_id)
    db.execute(f"UPDATE exercise_routines SET {', '.join(fields)} WHERE id = ?", values)
    return {"success": True}


@router.delete("/{routine_id}")
def delete_exercise(
    routine_id: int,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/exercises/[id] DELETE"""
    db.execute("DELETE FROM exercise_routines WHERE id = ?", (routine_id,))
    return {"success": True}


@router.post("/log")
def log_exercise(
    body: LogExerciseRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/exercises/log POST"""
    today = datetime.date.today().isoformat()
    now = datetime.datetime.utcnow().isoformat()
    existing = db.execute(
        "SELECT id FROM exercise_logs WHERE routine_id = ? AND log_date = ?",
        (body.routineId, today),
    ).fetchone()
    completed_at = now if body.status == "completed" else None
    if existing:
        db.execute(
            "UPDATE exercise_logs SET status = ?, duration_minutes = ?, notes = ?, completed_at = ? WHERE id = ?",
            (body.status, body.durationMinutes, body.notes, completed_at, existing["id"]),
        )
        return {"success": True, "updated": True}
    cursor = db.execute(
        """INSERT INTO exercise_logs
           (routine_id, patient_id, status, duration_minutes, notes, log_date, completed_at, created_at)
           VALUES (?,?,?,?,?,?,?,?)""",
        (body.routineId, current_user["id"], body.status, body.durationMinutes, body.notes, today, completed_at, now),
    )
    log = db.execute("SELECT * FROM exercise_logs WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return {"success": True, "log": row_to_dict(log)}
```

---

#### `backend/routers/notifications.py`

```python
# backend/routers/notifications.py
import sqlite3
from fastapi import APIRouter, Depends
from ..core.database import get_db, rows_to_list
from ..core.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def get_notifications(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/notifications GET"""
    rows = db.execute(
        """SELECT * FROM notifications WHERE user_id = ?
           ORDER BY created_at DESC LIMIT 20""",
        (current_user["id"],),
    ).fetchall()
    notifs = rows_to_list(rows)
    unread_count = sum(1 for n in notifs if not n["is_read"])
    return {"notifications": notifs, "unreadCount": unread_count}


@router.patch("")
def mark_all_read(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/notifications PATCH"""
    db.execute(
        "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
        (current_user["id"],),
    )
    return {"success": True}
```

---

#### `backend/routers/analytics.py`

```python
# backend/routers/analytics.py
import sqlite3
from fastapi import APIRouter, Depends
from ..core.database import get_db, rows_to_list
from ..core.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("")
def get_analytics(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/analytics GET"""
    uid = current_user["id"]
    role = current_user["role"]

    if role == "doctor":
        total_scans = db.execute("SELECT COUNT(*) as c FROM scans").fetchone()["c"]
        pending = db.execute("SELECT COUNT(*) as c FROM scans WHERE status='pending'").fetchone()["c"]
        completed = db.execute("SELECT COUNT(*) as c FROM scans WHERE status='completed'").fetchone()["c"]
        total_patients = db.execute("SELECT COUNT(*) as c FROM users WHERE role='patient'").fetchone()["c"]
        total_reports = db.execute("SELECT COUNT(*) as c FROM reports").fetchone()["c"]
        total_appts = db.execute("SELECT COUNT(*) as c FROM appointments WHERE doctor_id=?", (uid,)).fetchone()["c"]
        avg_conf_row = db.execute("SELECT AVG(ai_confidence) as a FROM scans WHERE status='completed'").fetchone()
        avg_conf = float(avg_conf_row["a"] or 0)
        modality_dist = rows_to_list(db.execute(
            "SELECT modality, COUNT(*) as count FROM scans GROUP BY modality"
        ).fetchall())
        status_dist = rows_to_list(db.execute(
            "SELECT status, COUNT(*) as count FROM scans GROUP BY status"
        ).fetchall())
        recent_scans = rows_to_list(db.execute(
            """SELECT s.*, u.name as patient_name FROM scans s
               LEFT JOIN users u ON s.patient_id = u.id
               ORDER BY s.uploaded_at DESC LIMIT 5"""
        ).fetchall())
        return {
            "role": "doctor",
            "stats": {
                "totalScans": total_scans, "pendingScans": pending, "completedScans": completed,
                "totalPatients": total_patients, "totalReports": total_reports,
                "totalAppointments": total_appts, "avgConfidence": avg_conf,
            },
            "charts": {"modalityDistribution": modality_dist, "statusDistribution": status_dist},
            "recentScans": recent_scans,
        }
    else:
        total = db.execute("SELECT COUNT(*) as c FROM scans WHERE patient_id=?", (uid,)).fetchone()["c"]
        comp = db.execute("SELECT COUNT(*) as c FROM scans WHERE patient_id=? AND status='completed'", (uid,)).fetchone()["c"]
        pend = db.execute("SELECT COUNT(*) as c FROM scans WHERE patient_id=? AND status='pending'", (uid,)).fetchone()["c"]
        appts = db.execute("SELECT COUNT(*) as c FROM appointments WHERE patient_id=?", (uid,)).fetchone()["c"]
        recent = rows_to_list(db.execute(
            "SELECT * FROM scans WHERE patient_id=? ORDER BY uploaded_at DESC LIMIT 5", (uid,)
        ).fetchall())
        return {
            "role": "patient",
            "stats": {"totalScans": total, "completedScans": comp, "pendingScans": pend, "appointments": appts},
            "recentScans": recent,
        }
```

---

#### `backend/routers/family.py`

```python
# backend/routers/family.py
import sqlite3
from fastapi import APIRouter, Depends, HTTPException
from ..core.database import get_db, row_to_dict, rows_to_list
from ..core.auth import get_current_user
from ..models.types import CreateFamilyMemberRequest, DeleteFamilyMemberRequest

router = APIRouter(prefix="/family", tags=["family"])


@router.get("")
def list_family(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    rows = db.execute(
        "SELECT * FROM family_members WHERE patient_id = ?", (current_user["id"],)
    ).fetchall()
    return {"members": rows_to_list(rows)}


@router.post("")
def add_family_member(
    body: CreateFamilyMemberRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    cursor = db.execute(
        "INSERT INTO family_members (patient_id, name, relation) VALUES (?, ?, ?)",
        (current_user["id"], body.name, body.relation),
    )
    member = db.execute("SELECT * FROM family_members WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return {"member": row_to_dict(member)}


@router.delete("")
def remove_family_member(
    body: DeleteFamilyMemberRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    db.execute(
        "DELETE FROM family_members WHERE id = ? AND patient_id = ?",
        (body.memberId, current_user["id"]),
    )
    return {"success": True}
```

---

#### `backend/routers/doctor.py`

```python
# backend/routers/doctor.py
import sqlite3
import datetime
from fastapi import APIRouter, Depends, HTTPException
from ..core.database import get_db, row_to_dict, rows_to_list
from ..core.auth import get_current_user, get_doctor
from ..models.types import UpdateDoctorProfileRequest

router = APIRouter(prefix="/doctor", tags=["doctor"])


@router.get("/stats")
def get_doctor_stats(
    current_user: dict = Depends(get_doctor),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/doctor/stats"""
    today_str = datetime.date.today().isoformat()
    pending = db.execute("SELECT COUNT(*) as c FROM scans WHERE status='pending'").fetchone()["c"]
    critical = db.execute("SELECT COUNT(*) as c FROM scans WHERE priority='critical'").fetchone()["c"]
    reviewed_today = db.execute(
        "SELECT COUNT(*) as c FROM scans WHERE status='completed' AND DATE(reviewed_at) = ?", (today_str,)
    ).fetchone()["c"]
    pending_scans = rows_to_list(db.execute(
        """SELECT s.*, u.name as patient_name FROM scans s
           LEFT JOIN users u ON s.patient_id = u.id
           WHERE s.status='pending' ORDER BY s.uploaded_at DESC LIMIT 10"""
    ).fetchall())
    high_risk_scans = rows_to_list(db.execute(
        """SELECT s.*, u.name as patient_name FROM scans s
           LEFT JOIN users u ON s.patient_id = u.id
           WHERE s.priority='critical' ORDER BY s.uploaded_at DESC LIMIT 5"""
    ).fetchall())
    return {
        "pending": pending, "critical": critical, "reviewedToday": reviewed_today,
        "avgTime": 4.2, "pendingScans": pending_scans, "highRiskScans": high_risk_scans,
    }


@router.get("/profile")
def get_doctor_profile(
    current_user: dict = Depends(get_doctor),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/doctor/profile GET"""
    profile = db.execute(
        "SELECT * FROM doctor_profiles WHERE user_id = ?", (current_user["id"],)
    ).fetchone()
    return {"profile": row_to_dict(profile)}


@router.put("/profile")
def update_doctor_profile(
    body: UpdateDoctorProfileRequest,
    current_user: dict = Depends(get_doctor),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/doctor/profile PUT"""
    existing = db.execute(
        "SELECT id FROM doctor_profiles WHERE user_id = ?", (current_user["id"],)
    ).fetchone()
    if existing:
        db.execute(
            """UPDATE doctor_profiles
               SET specialty=?, degree=?, license_number=?, experience=?
               WHERE user_id=?""",
            (body.specialty, body.degree, body.licenseNumber, body.experience, current_user["id"]),
        )
    else:
        db.execute(
            """INSERT INTO doctor_profiles
               (user_id, specialty, degree, license_number, experience, rating,
                total_consultations, total_scans_reviewed)
               VALUES (?,?,?,?,?,5.0,0,0)""",
            (current_user["id"], body.specialty, body.degree, body.licenseNumber, body.experience),
        )
    return {"success": True}


@router.get("/patients/{patient_id}")
def get_patient_history(
    patient_id: int,
    current_user: dict = Depends(get_doctor),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/doctor/patients/[id] GET"""
    patient = db.execute(
        "SELECT * FROM users WHERE id = ? AND role = 'patient'", (patient_id,)
    ).fetchone()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    scans = rows_to_list(db.execute(
        "SELECT * FROM scans WHERE patient_id = ? ORDER BY uploaded_at DESC", (patient_id,)
    ).fetchall())
    reports = rows_to_list(db.execute(
        "SELECT * FROM reports WHERE patient_id = ? ORDER BY created_at DESC", (patient_id,)
    ).fetchall())
    appointments = rows_to_list(db.execute(
        "SELECT * FROM appointments WHERE patient_id = ? ORDER BY scheduled_at DESC", (patient_id,)
    ).fetchall())
    return {
        "patient": row_to_dict(patient),
        "scans": scans, "reports": reports, "appointments": appointments,
    }
```

---

#### `backend/routers/ai.py`

```python
# backend/routers/ai.py
import sqlite3
import json
import httpx
from fastapi import APIRouter, Depends, HTTPException
from ..core.database import get_db
from ..core.auth import get_current_user
from ..core.config import settings
from ..models.types import ReportRequest, TreatmentRequest, SuggestRequest

router = APIRouter(prefix="/ai", tags=["ai"])
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


async def _groq(messages: list, model="llama-3.3-70b-versatile",
                temperature=0.2, max_tokens=1000, json_mode=True) -> str:
    body = {"model": model, "messages": messages,
            "temperature": temperature, "max_tokens": max_tokens}
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(GROQ_URL, headers={
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json",
        }, json=body)
        resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


@router.post("/report")
async def generate_report(
    body: ReportRequest,
    current_user: dict = Depends(get_current_user),
):
    """Matches /api/ai/report — identical prompt to original"""
    prompt = f"""
Act as a radiologist. Write a formal medical report for a {body.modality} scan.
Diagnosis: {body.diagnosis}
Findings: {body.findings}
Output Language: {body.language}
Return strictly valid JSON with a "report" field containing the full text report string.
Example: {{ "report": "Patient Name: ...\\n Modality: ...\\n Findings: ..." }}
"""
    try:
        content = await _groq([{"role": "user", "content": prompt}])
        return json.loads(content)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to generate report")


@router.post("/treatment")
async def generate_treatment(
    body: TreatmentRequest,
    current_user: dict = Depends(get_current_user),
):
    """Matches /api/ai/treatment — identical prompt to original"""
    prompt = f"""
Act as a senior specialist doctor. Create a personalized treatment plan:
- Age: {body.age or "Unknown"}
- Sex: {body.sex or "Unknown"}
- Diagnosis: {body.diagnosis}
- Key Findings: {body.findings or "See scan"}
Return strictly valid JSON:
{{
    "treatment_plan": {{
        "urgency_level": "IMMEDIATE" | "HIGH" | "MODERATE" | "LOW",
        "medications": ["..."], "tests": ["..."], "referrals": ["..."],
        "lifestyle": ["..."], "contraindications": ["..."]
    }}
}}
"""
    try:
        content = await _groq([{"role": "user", "content": prompt}], temperature=0.1)
        return json.loads(content)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to generate treatment plan")


@router.post("/suggest")
async def suggest_replies(
    body: SuggestRequest,
    current_user: dict = Depends(get_current_user),
):
    """Matches /api/ai/suggest — identical prompt to original"""
    system = f"""You are an AI assistant in a medical consultation on VaidyaVision.
{f'Context: {body.context}' if body.context else ''}
Suggest 3 helpful professional reply options (1-2 sentences each).
Return only a JSON array of 3 strings."""
    msgs = [{"role": "system", "content": system}]
    for m in (body.messages or [])[-6:]:
        msgs.append({
            "role": "user" if m.get("isCurrentUser") else "assistant",
            "content": m.get("content", ""),
        })
    msgs.append({"role": "user", "content": "Suggest 3 reply options:"})
    try:
        content = await _groq(msgs, model="llama-3.1-8b-instant",
                               temperature=0.7, max_tokens=300, json_mode=False)
        suggestions = json.loads(content)
    except Exception:
        suggestions = [
            "Could you provide more details about your symptoms?",
            "I'll review the scan results and get back to you shortly.",
            "Let's schedule a follow-up appointment to discuss this further.",
        ]
    return {"suggestions": suggestions[:3]}
```

---

#### `backend/routers/communications.py`

```python
# backend/routers/communications.py
import sqlite3
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from ..core.database import get_db, row_to_dict
from ..core.auth import get_current_user
from ..core.config import settings
from ..models.types import EmailReportRequest, CallReminderRequest

router = APIRouter(prefix="/communications", tags=["communications"])


@router.post("/email")
async def send_report_email(
    body: EmailReportRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/send-report-email"""
    scan = db.execute(
        "SELECT s.*, u.name as patient_name, u.email as patient_email FROM scans s LEFT JOIN users u ON s.patient_id=u.id WHERE s.id=?",
        (body.scanId,),
    ).fetchone()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    scan = row_to_dict(scan)

    try:
        import resend
        resend.api_key = settings.RESEND_API_KEY
        params = {
            "from": "VaidyaVision <onboarding@resend.dev>",
            "to": scan["patient_email"],
            "subject": "🏥 Your Medical Report is Ready",
            "html": f"""<div style="font-family: sans-serif;">
                <h2>Hello {scan['patient_name']},</h2>
                <p>Your scan (ID: #{scan['id']}) has been reviewed.</p>
                <div style="background:#f0fdf4;padding:20px;border-radius:8px;">
                    <p><strong>AI Diagnosis:</strong> {scan['ai_diagnosis'] or 'Pending'}</p>
                </div>
                <a href="{settings.FRONTEND_URL}/patient/scans" style="background:#059669;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:16px;">
                    View in Portal
                </a>
            </div>""",
        }
        r = resend.Emails.send(params)
        return {"sent": True, "id": r.get("id")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/call")
async def call_patient(
    body: CallReminderRequest,
    current_user: dict = Depends(get_current_user),
):
    """Matches /api/call-reminder"""
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        raise HTTPException(status_code=500, detail="Twilio not configured")
    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        twiml_url = (
            f"{settings.APP_URL}/communications/twiml-reminder"
            f"?name={body.patientName}&time={body.appointmentTime}"
        )
        call = client.calls.create(
            to=body.patientPhone,
            from_=settings.TWILIO_PHONE_NUMBER,
            url=twiml_url,
        )
        return {"called": True, "sid": call.sid}
    except Exception as e:
        return {"called": False, "error": str(e)}


@router.post("/twiml-reminder")
async def twiml_reminder(request: Request):
    """Matches /api/twiml-reminder"""
    params = dict(request.query_params)
    name = params.get("name", "there")
    time_str = params.get("time", "scheduled time")
    twiml = f"""<Response>
  <Say voice="alice">Hello {name}! This is VaidyaVision reminding you about your appointment scheduled for {time_str}.</Say>
  <Gather numDigits="1" action="/communications/twiml-confirm">
    <Say>Press 1 to confirm, or 2 to reschedule.</Say>
  </Gather>
  <Say>We didn't receive any input. Goodbye!</Say>
</Response>"""
    return Response(content=twiml, media_type="text/xml")


@router.post("/twiml-confirm")
async def twiml_confirm(request: Request):
    """Matches /api/twiml-confirm"""
    form = await request.form()
    digits = form.get("Digits", "")
    if digits == "1":
        text = "Thank you for confirming. We look forward to seeing you."
    elif digits == "2":
        text = "Understood. A staff member will contact you shortly to reschedule."
    else:
        text = "Invalid input. Goodbye."
    return Response(content=f"<Response><Say voice='alice'>{text}</Say></Response>", media_type="text/xml")
```

---

#### `backend/routers/followups.py`

```python
# backend/routers/followups.py
import sqlite3
import datetime
from fastapi import APIRouter, Depends, HTTPException
from ..core.database import get_db, rows_to_list
from ..core.auth import get_current_user
from ..core.config import settings
from ..models.types import ScheduleFollowupRequest

router = APIRouter(prefix="/followups", tags=["followups"])


@router.post("")
def schedule_followup(
    body: ScheduleFollowupRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/schedule-followup POST"""
    scan = db.execute("SELECT patient_id FROM scans WHERE id=?", (body.scanId,)).fetchone()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    import time
    scheduled_for = int(time.time()) + (body.days * 86400)
    db.execute(
        "INSERT INTO follow_ups (scan_id, patient_id, scheduled_for, type, status) VALUES (?,?,?,?,?)",
        (body.scanId, scan["patient_id"], scheduled_for, body.type or "email", "pending"),
    )
    return {"scheduled": True, "date": scheduled_for}


@router.get("")
def process_due_followups(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/schedule-followup GET (manual cron trigger)"""
    import time
    now = int(time.time())
    due = rows_to_list(db.execute(
        "SELECT * FROM follow_ups WHERE scheduled_for < ? AND status='pending'", (now,)
    ).fetchall())
    processed = []
    for f in due:
        try:
            import httpx
            httpx.post(
                f"{settings.APP_URL}/communications/email",
                json={"scanId": f["scan_id"]},
                timeout=10,
            )
            db.execute("UPDATE follow_ups SET status='sent' WHERE id=?", (f["id"],))
            processed.append(f["id"])
        except Exception:
            db.execute("UPDATE follow_ups SET status='failed' WHERE id=?", (f["id"],))
    return {"processedCount": len(processed), "processedIds": processed}
```

---

#### `backend/routers/voice_notes.py`

```python
# backend/routers/voice_notes.py
import sqlite3
import datetime
from fastapi import APIRouter, Depends, HTTPException
from ..core.database import get_db, row_to_dict
from ..core.auth import get_current_user
from ..models.types import VoiceNoteRequest

router = APIRouter(prefix="/voice-notes", tags=["voice-notes"])


@router.post("")
def save_voice_note(
    body: VoiceNoteRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/voice-notes POST"""
    scan = db.execute("SELECT id FROM scans WHERE id=?", (body.scanId,)).fetchone()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    now = int(datetime.datetime.utcnow().timestamp())
    db.execute(
        "INSERT INTO voice_notes (scan_id, transcription, created_at) VALUES (?,?,?)",
        (body.scanId, body.transcription, now),
    )
    return {"success": True}
```

---

#### `backend/routers/ocr_routes.py`

```python
# backend/routers/ocr_routes.py
import sqlite3
import os
import uuid
import json
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from ..core.database import get_db, row_to_dict
from ..core.auth import get_current_user
from ..core.config import settings

router = APIRouter(prefix="/ocr", tags=["ocr"])

ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://localhost:8000")  # Internal routing


@router.post("/process")
async def ocr_process(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Matches /api/ocr POST.
    Forwards to the ml/ OCR service and returns structured data.
    """
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "ml"))
    from ocr_service import MedicalOCR
    from report_cleaner import clean_and_structure

    contents = await file.read()
    filename = file.filename or ""

    engine = MedicalOCR()
    if filename.lower().endswith(".pdf"):
        ocr_result = engine.extract_from_pdf(contents)
    else:
        ocr_result = engine.extract_text(contents)

    raw_text = ocr_result.get("raw_text", "")
    doc_type = ocr_result.get("document_type", "auto")

    if not raw_text.strip():
        raise HTTPException(status_code=422, detail="No text could be extracted")

    cleaned = await clean_and_structure(raw_text, doc_type)
    result = {"status": "success", **cleaned}

    # Normalize medications field (same logic as original /api/ocr route)
    sd = result.get("structured_data") or {}
    if not sd.get("medications") and sd.get("key_information", {}).get("medications"):
        sd["medications"] = [
            {"drug_name": m, "dosage": "", "frequency": "", "duration": "", "instructions": ""}
            for m in sd["key_information"]["medications"]
        ]
    if not sd.get("medications") and sd.get("medications_at_discharge"):
        sd["medications"] = sd["medications_at_discharge"]

    result["confidence"] = ocr_result.get("confidence")
    result["method_used"] = ocr_result.get("method_used")
    return result


@router.post("/save")
async def ocr_save(
    file: UploadFile = File(...),
    ocrResult: str = Form(...),
    patientId: Optional[int] = Form(None),
    doctorId: Optional[int] = Form(None),
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/ocr/save POST"""
    ocr_data = json.loads(ocrResult)
    structured = ocr_data.get("structured_data") or {}

    # Save image file
    prescriptions_dir = os.path.join(settings.UPLOADS_DIR, "prescriptions")
    os.makedirs(prescriptions_dir, exist_ok=True)
    contents = await file.read()
    ext = (file.filename or "jpg").split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    with open(os.path.join(prescriptions_dir, filename), "wb") as f:
        f.write(contents)
    image_url = f"/public/uploads/prescriptions/{filename}"

    target_patient_id = (
        patientId if (current_user["role"] == "doctor" and patientId) else current_user["id"]
    )
    now = datetime.datetime.utcnow().isoformat()

    cursor = db.execute(
        """INSERT INTO prescriptions
           (patient_id, image_url, document_type, ocr_confidence, ocr_method,
            raw_text, cleaned_text, structured_data, prescribing_doctor,
            prescription_date, uploaded_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
        (
            target_patient_id, image_url,
            ocr_data.get("document_type", "medical_document"),
            ocr_data.get("confidence"), ocr_data.get("method_used"),
            ocr_data.get("raw_text"), ocr_data.get("cleaned_text"),
            json.dumps(structured),
            structured.get("doctor_name"),
            structured.get("date"),
            now,
        ),
    )
    prescription_id = cursor.lastrowid

    # Auto-create medication records
    meds_created = 0
    if isinstance(structured.get("medications"), list):
        for med in structured["medications"]:
            times = _parse_frequency(med.get("frequency", ""))
            db.execute(
                """INSERT INTO medications
                   (patient_id, prescription_id, drug_name, dosage, form, frequency,
                    time_of_day, duration, start_date, instructions, added_by, created_at, updated_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    target_patient_id, prescription_id,
                    med.get("drug_name") or med.get("name") or "Unknown",
                    med.get("dosage"), med.get("form"), med.get("frequency"),
                    json.dumps(times),
                    med.get("duration"),
                    datetime.date.today().isoformat(),
                    med.get("instructions"),
                    "ocr", now, now,
                ),
            )
            meds_created += 1

    return {"success": True, "prescriptionId": prescription_id, "medicationsCreated": meds_created}


def _parse_frequency(frequency: str) -> list:
    """Same logic as the original parseFrequencyToTimes in /api/ocr/save."""
    f = (frequency or "").lower()
    if any(x in f for x in ["thrice", "3 times", "three times", "tid", "tds"]):
        return ["morning", "afternoon", "evening"]
    if any(x in f for x in ["twice", "2 times", "two times", "bid", "bd"]):
        return ["morning", "evening"]
    if any(x in f for x in ["four", "4 times", "qid"]):
        return ["morning", "afternoon", "evening", "night"]
    if "morning" in f:
        return ["morning"]
    if any(x in f for x in ["evening", "night", "bedtime", "hs"]):
        return ["evening"]
    return ["morning"]
```

---

#### `backend/routers/developer.py`

```python
# backend/routers/developer.py
import sqlite3
import os
import datetime
import secrets
from fastapi import APIRouter, Depends, HTTPException
from ..core.database import get_db, row_to_dict, rows_to_list
from ..core.auth import get_current_user
from ..models.types import CreateApiKeyRequest

router = APIRouter(prefix="/developer", tags=["developer"])


def _generate_key(env: str) -> str:
    prefix = "vv_live_" if env == "live" else "vv_test_"
    return prefix + secrets.token_hex(32)


@router.get("/keys")
def list_keys(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    rows = rows_to_list(db.execute(
        "SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC",
        (current_user["id"],),
    ).fetchall())
    safe = [{**r, "key": f"{r['prefix']}...{r['key'][-4:]}"} for r in rows]
    return {"keys": safe}


@router.post("/keys")
def create_key(
    body: CreateApiKeyRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    if not body.name or len(body.name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Key name required (min 2 chars)")
    count = db.execute(
        "SELECT COUNT(*) as c FROM api_keys WHERE user_id=?", (current_user["id"],)
    ).fetchone()["c"]
    if count >= 10:
        raise HTTPException(status_code=400, detail="Maximum 10 API keys per account")

    key = _generate_key(body.environment or "test")
    prefix = key[:8]
    now = datetime.datetime.utcnow().isoformat()
    rate_limit = 60 if body.environment == "live" else 100
    cursor = db.execute(
        """INSERT INTO api_keys
           (user_id, name, key, prefix, environment, scopes, rate_limit, is_active, created_at)
           VALUES (?,?,?,?,?,?,?,1,?)""",
        (current_user["id"], body.name.strip(), key, prefix,
         body.environment or "test", body.scopes or "predict,ocr", rate_limit, now),
    )
    created = row_to_dict(db.execute("SELECT * FROM api_keys WHERE id=?", (cursor.lastrowid,)).fetchone())
    return {"key": {**created, "fullKey": key}}


@router.delete("/keys")
def revoke_key(
    id: int,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    db.execute(
        "DELETE FROM api_keys WHERE id=? AND user_id=?", (id, current_user["id"])
    )
    return {"success": True}
```

---

### 4.7 `backend/main.py`

```python
# backend/main.py
import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse

from core.config import settings

# Make ml/ importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "ml"))

from routers import (
    users, scans, reports, appointments, conversations,
    medications, exercises, notifications, analytics,
    family, developer, doctor, ai, communications,
    followups, voice_notes, ocr_routes,
)

app = FastAPI(
    title="VaidyaVision API",
    version="2.0.0",
    description="Unified backend for VaidyaVision medical AI platform",
)

# ── CORS ─────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static files (uploads, heatmaps) ────────────────────────────
os.makedirs("./public/uploads", exist_ok=True)
os.makedirs("./public/heatmaps", exist_ok=True)
os.makedirs("./public/uploads/prescriptions", exist_ok=True)
app.mount("/public", StaticFiles(directory="./public"), name="public")

# ── Business logic routers ───────────────────────────────────────
app.include_router(users.router)
app.include_router(scans.router)
app.include_router(reports.router)
app.include_router(appointments.router)
app.include_router(conversations.router)
app.include_router(medications.router)
app.include_router(exercises.router)
app.include_router(notifications.router)
app.include_router(analytics.router)
app.include_router(family.router)
app.include_router(developer.router)
app.include_router(doctor.router)
app.include_router(ai.router)
app.include_router(communications.router)
app.include_router(followups.router)
app.include_router(voice_notes.router)
app.include_router(ocr_routes.router)

# ── ML + Research endpoints (re-exported from ml/server.py) ─────
from ml.server import (
    predict_endpoint, ocr_extract, ocr_clean_report,
    ocr_prescriptions_only, research_ask, research_crawl,
    research_stats, research_export_qa,
)
app.add_api_route("/ml/predict", predict_endpoint, methods=["POST"], tags=["ml"])
app.add_api_route("/ml/ocr/extract", ocr_extract, methods=["POST"], tags=["ml"])
app.add_api_route("/ml/ocr/clean-report", ocr_clean_report, methods=["POST"], tags=["ml"])
app.add_api_route("/ml/ocr/prescriptions-only", ocr_prescriptions_only, methods=["POST"], tags=["ml"])
app.add_api_route("/research/ask", research_ask, methods=["POST"], tags=["research"])
app.add_api_route("/research/crawl-latest", research_crawl, methods=["POST"], tags=["research"])
app.add_api_route("/research/stats", research_stats, methods=["GET"], tags=["research"])
app.add_api_route("/research/export-qa", research_export_qa, methods=["GET"], tags=["research"])


@app.on_event("startup")
def startup():
    """Load ML models on startup."""
    try:
        from ml.inference import load_models
        if os.path.isfile(settings.ML_MODEL_PATH):
            load_models(settings.ML_MODEL_PATH)
            print("[INFO] ML models loaded successfully.")
        else:
            print(f"[WARN] Model file not found at {settings.ML_MODEL_PATH}. ML inference disabled.")
    except Exception as e:
        print(f"[WARN] Could not load ML models: {e}")


@app.get("/health")
def health():
    return {"status": "online", "service": "VaidyaVision API v2"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
```

---

### 4.8 `backend/requirements.txt`

```
# Web framework
fastapi>=0.104.0
uvicorn[standard]>=0.24.0

# Auth
PyJWT>=2.8.0
cryptography>=41.0.0

# HTTP client (for Groq, Resend, etc.)
httpx>=0.25.0

# Request body parsing
python-multipart>=0.0.6

# Settings / config
pydantic>=2.0.0
pydantic-settings>=2.0.0

# Communications
twilio>=5.12.1
resend>=6.9.2

# ML dependencies (from original ml-service/requirements.txt)
torch>=2.1.0
torchvision>=0.16.0
timm>=0.9.12
Pillow>=10.1.0
numpy>=1.26.0
opencv-python-headless>=4.8.0
python-multipart>=0.0.6
pytesseract>=0.3.10
pdf2image>=1.16.3
google-cloud-vision>=3.5.0
firecrawl-py>=1.0.0
rank-bm25>=0.2.2
```

---

### 4.9 `backend/.env.example`

```env
# Database — points to the shared SQLite file
DATABASE_PATH=./data/vaidyavision.db

# Clerk Auth
CLERK_SECRET_KEY=sk_test_...
CLERK_JWKS_URL=https://api.clerk.dev/v1/jwks

# External APIs
GROQ_API_KEY=gsk_...
RESEND_API_KEY=re_...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
GOOGLE_API_KEY=...
FIRECRAWL_API_KEY=fc-...

# App URLs
FRONTEND_URL=http://localhost:3000
APP_URL=http://localhost:8000

# ML
ML_MODEL_PATH=./ml/medical_ai_system_final.pth
UPLOADS_DIR=./public/uploads
HEATMAPS_DIR=./public/heatmaps
```

---

## 5. Phase 2 — Frontend Implementation

### 5.1 What Stays Exactly the Same (Zero Changes)

Every single file in these directories copies over unchanged:

```
app/(marketing)/
app/sign-in/
app/sign-up/
app/globals.css
app/layout.tsx
app/not-found.tsx
components/games/
components/marketing/
tailwind.config.ts
middleware.ts
drizzle/                    ← All migration SQL files
lib/db/schema.ts            ← UNCHANGED — still the canonical schema
```

### 5.2 What Gets Removed

```
app/api/                    ← DELETE ENTIRE DIRECTORY
                              (All logic has moved to FastAPI)
```

### 5.3 `frontend/lib/db/index.ts` (Updated DB Path Only)

The only change to any Drizzle file is updating the path to the shared database:

```typescript
// frontend/lib/db/index.ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

// Points to the shared database in the backend directory
// During development: ../backend/data/vaidyavision.db
// Can be overridden with DB_PATH env var
const dbPath = process.env.DB_PATH || path.join(process.cwd(), "..", "backend", "data", "vaidyavision.db");

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
```

> **Note:** Drizzle is now used in the frontend **only** for schema management and migrations — not for any API logic. When you run `npx drizzle-kit generate` or `npx drizzle-kit migrate`, it uses `drizzle.config.ts` which points to the same shared DB file.

### 5.4 `frontend/drizzle.config.ts` (Updated Path)

```typescript
// frontend/drizzle.config.ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  driver: "better-sqlite",
  dbCredentials: {
    url: process.env.DB_PATH || "../backend/data/vaidyavision.db",
  },
} satisfies Config;
```

### 5.5 `frontend/lib/api/client.ts`

The single central place for all backend fetch calls. Every other API file imports from here.

```typescript
// frontend/lib/api/client.ts

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

/**
 * Client-side fetch — use in "use client" components.
 * Pass the token from useAuth().getToken().
 */
export async function apiFetch(
  path: string,
  token: string | null,
  options: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Only set Content-Type for non-FormData requests
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(`${BACKEND_URL}${path}`, { ...options, headers });
}

/**
 * Server-side fetch — use in Server Components.
 * Imports Clerk server auth automatically.
 */
export async function serverFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const { auth } = await import("@clerk/nextjs/server");
  const { getToken } = await auth();
  const token = await getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  return fetch(`${BACKEND_URL}${path}`, { ...options, headers });
}

export { BACKEND_URL };
```

### 5.6 Typed API Client Files

Each file is a thin typed wrapper. Here is the complete set:

```typescript
// frontend/lib/api/users.ts
import { apiFetch } from "./client";

export const usersApi = {
  me: (token: string) =>
    apiFetch("/users/me", token).then((r) => r.json()),

  sync: (token: string, data: { name: string; email: string; imageUrl?: string }) =>
    apiFetch("/users/sync", token, { method: "POST", body: JSON.stringify(data) }).then((r) => r.json()),

  onboard: (token: string, role: string) =>
    apiFetch("/users/onboard", token, { method: "POST", body: JSON.stringify({ role }) }).then((r) => r.json()),

  listPatients: (token: string) =>
    apiFetch("/users/patients", token).then((r) => r.json()),

  createPatient: (token: string, data: object) =>
    apiFetch("/users/patients", token, { method: "POST", body: JSON.stringify(data) }).then((r) => r.json()),
};
```

```typescript
// frontend/lib/api/scans.ts
import { apiFetch } from "./client";

export const scansApi = {
  list: (token: string, status?: string) =>
    apiFetch(`/scans${status ? `?status=${status}` : ""}`, token).then((r) => r.json()),

  get: (token: string, id: number) =>
    apiFetch(`/scans/${id}`, token).then((r) => r.json()),

  update: (token: string, id: number, data: object) =>
    apiFetch(`/scans/${id}`, token, { method: "PATCH", body: JSON.stringify(data) }).then((r) => r.json()),

  upload: (token: string, formData: FormData) =>
    apiFetch("/scans/upload", token, { method: "POST", body: formData }).then((r) => r.json()),
};
```

```typescript
// frontend/lib/api/reports.ts
import { apiFetch } from "./client";

export const reportsApi = {
  list: (token: string) =>
    apiFetch("/reports", token).then((r) => r.json()),

  get: (token: string, id: number) =>
    apiFetch(`/reports/${id}`, token).then((r) => r.json()),

  create: (token: string, data: object) =>
    apiFetch("/reports", token, { method: "POST", body: JSON.stringify(data) }).then((r) => r.json()),
};
```

```typescript
// frontend/lib/api/appointments.ts
import { apiFetch } from "./client";

export const appointmentsApi = {
  list: (token: string) =>
    apiFetch("/appointments", token).then((r) => r.json()),

  create: (token: string, data: object) =>
    apiFetch("/appointments", token, { method: "POST", body: JSON.stringify(data) }).then((r) => r.json()),

  update: (token: string, data: { appointmentId: number; status: string }) =>
    apiFetch("/appointments", token, { method: "PATCH", body: JSON.stringify(data) }).then((r) => r.json()),
};
```

```typescript
// frontend/lib/api/conversations.ts
import { apiFetch } from "./client";

export const conversationsApi = {
  list: (token: string) =>
    apiFetch("/conversations", token).then((r) => r.json()),

  create: (token: string, otherUserId: number) =>
    apiFetch("/conversations", token, { method: "POST", body: JSON.stringify({ otherUserId }) }).then((r) => r.json()),

  getMessages: (token: string, id: number) =>
    apiFetch(`/conversations/${id}/messages`, token).then((r) => r.json()),

  sendMessage: (token: string, id: number, content: string, type = "text") =>
    apiFetch(`/conversations/${id}/messages`, token, {
      method: "POST",
      body: JSON.stringify({ content, type }),
    }).then((r) => r.json()),
};
```

```typescript
// frontend/lib/api/medications.ts
import { apiFetch } from "./client";

export const medicationsApi = {
  list: (token: string, patientId?: number) =>
    apiFetch(`/medications${patientId ? `?patientId=${patientId}` : ""}`, token).then((r) => r.json()),

  create: (token: string, data: object) =>
    apiFetch("/medications", token, { method: "POST", body: JSON.stringify(data) }).then((r) => r.json()),

  update: (token: string, id: number, data: object) =>
    apiFetch(`/medications/${id}`, token, { method: "PATCH", body: JSON.stringify(data) }).then((r) => r.json()),

  delete: (token: string, id: number) =>
    apiFetch(`/medications/${id}`, token, { method: "DELETE" }).then((r) => r.json()),

  log: (token: string, data: object) =>
    apiFetch("/medications/log", token, { method: "POST", body: JSON.stringify(data) }).then((r) => r.json()),
};
```

```typescript
// frontend/lib/api/exercises.ts
import { apiFetch } from "./client";

export const exercisesApi = {
  list: (token: string, patientId?: number) =>
    apiFetch(`/exercises${patientId ? `?patientId=${patientId}` : ""}`, token).then((r) => r.json()),

  create: (token: string, data: object) =>
    apiFetch("/exercises", token, { method: "POST", body: JSON.stringify(data) }).then((r) => r.json()),

  update: (token: string, id: number, data: object) =>
    apiFetch(`/exercises/${id}`, token, { method: "PATCH", body: JSON.stringify(data) }).then((r) => r.json()),

  delete: (token: string, id: number) =>
    apiFetch(`/exercises/${id}`, token, { method: "DELETE" }).then((r) => r.json()),

  log: (token: string, data: object) =>
    apiFetch("/exercises/log", token, { method: "POST", body: JSON.stringify(data) }).then((r) => r.json()),
};
```

```typescript
// frontend/lib/api/notifications.ts
import { apiFetch } from "./client";

export const notificationsApi = {
  list: (token: string) =>
    apiFetch("/notifications", token).then((r) => r.json()),

  markAllRead: (token: string) =>
    apiFetch("/notifications", token, { method: "PATCH" }).then((r) => r.json()),
};
```

```typescript
// frontend/lib/api/analytics.ts
import { apiFetch } from "./client";

export const analyticsApi = {
  get: (token: string) =>
    apiFetch("/analytics", token).then((r) => r.json()),
};
```

```typescript
// frontend/lib/api/family.ts
import { apiFetch } from "./client";

export const familyApi = {
  list: (token: string) =>
    apiFetch("/family", token).then((r) => r.json()),

  add: (token: string, data: { name: string; relation: string }) =>
    apiFetch("/family", token, { method: "POST", body: JSON.stringify(data) }).then((r) => r.json()),

  remove: (token: string, memberId: number) =>
    apiFetch("/family", token, { method: "DELETE", body: JSON.stringify({ memberId }) }).then((r) => r.json()),
};
```

```typescript
// frontend/lib/api/doctor.ts
import { apiFetch } from "./client";

export const doctorApi = {
  getStats: (token: string) =>
    apiFetch("/doctor/stats", token).then((r) => r.json()),

  getProfile: (token: string) =>
    apiFetch("/doctor/profile", token).then((r) => r.json()),

  updateProfile: (token: string, data: object) =>
    apiFetch("/doctor/profile", token, { method: "PUT", body: JSON.stringify(data) }).then((r) => r.json()),

  getPatient: (token: string, id: number) =>
    apiFetch(`/doctor/patients/${id}`, token).then((r) => r.json()),
};
```

```typescript
// frontend/lib/api/ai.ts
import { apiFetch } from "./client";

export const aiApi = {
  generateReport: (token: string, data: object) =>
    apiFetch("/ai/report", token, { method: "POST", body: JSON.stringify(data) }).then((r) => r.json()),

  generateTreatment: (token: string, data: object) =>
    apiFetch("/ai/treatment", token, { method: "POST", body: JSON.stringify(data) }).then((r) => r.json()),

  suggestReplies: (token: string, data: object) =>
    apiFetch("/ai/suggest", token, { method: "POST", body: JSON.stringify(data) }).then((r) => r.json()),
};
```

```typescript
// frontend/lib/api/communications.ts
import { apiFetch } from "./client";

export const communicationsApi = {
  sendEmail: (token: string, scanId: number) =>
    apiFetch("/communications/email", token, { method: "POST", body: JSON.stringify({ scanId }) }).then((r) => r.json()),

  callPatient: (token: string, data: object) =>
    apiFetch("/communications/call", token, { method: "POST", body: JSON.stringify(data) }).then((r) => r.json()),
};
```

```typescript
// frontend/lib/api/ocr.ts
import { apiFetch } from "./client";

export const ocrApi = {
  process: (token: string, formData: FormData) =>
    apiFetch("/ocr/process", token, { method: "POST", body: formData }).then((r) => r.json()),

  save: (token: string, formData: FormData) =>
    apiFetch("/ocr/save", token, { method: "POST", body: formData }).then((r) => r.json()),
};
```

```typescript
// frontend/lib/api/research.ts
import { apiFetch } from "./client";

export const researchApi = {
  ask: (token: string, query: string) =>
    apiFetch("/research/ask", token, { method: "POST", body: JSON.stringify({ query }) }).then((r) => r.json()),

  getStats: (token: string) =>
    apiFetch("/research/stats", token).then((r) => r.json()),
};
```

```typescript
// frontend/lib/api/developer.ts
import { apiFetch } from "./client";

export const developerApi = {
  listKeys: (token: string) =>
    apiFetch("/developer/keys", token).then((r) => r.json()),

  createKey: (token: string, data: object) =>
    apiFetch("/developer/keys", token, { method: "POST", body: JSON.stringify(data) }).then((r) => r.json()),

  revokeKey: (token: string, id: number) =>
    apiFetch(`/developer/keys?id=${id}`, token, { method: "DELETE" }).then((r) => r.json()),
};
```

---

### 5.7 URL Replacement Map

This is the **complete list of every `fetch("/api/...")` call** in the codebase and what it becomes. The surrounding JSX/logic code is untouched.

| File | Old URL | New URL |
|---|---|---|
| `app/onboarding/page.tsx` | `/api/users/sync` | `/users/sync` |
| `app/onboarding/page.tsx` | `/api/users/me` | `/users/me` |
| `app/onboarding/page.tsx` | `/api/users/onboard` | `/users/onboard` |
| `app/dashboard/page.tsx` | `/api/users/me` (server) | use `serverFetch("/users/me")` |
| `app/doctor/page.tsx` | `/api/doctor/stats` | `/doctor/stats` |
| `app/doctor/page.tsx` | `/api/appointments` | `/appointments` |
| `app/doctor/queue/page.tsx` | `/api/scans?status=pending` | `/scans?status=pending` |
| `app/doctor/scan/[id]/page.tsx` | `/api/scans/${id}` | `/scans/${id}` |
| `app/doctor/scan/[id]/page.tsx` | `http://localhost:8000/predict` | `/ml/predict` (internal) |
| `app/doctor/scan/[id]/page.tsx` | `/api/scans/${id}` PATCH | `/scans/${id}` |
| `app/doctor/scan/[id]/page.tsx` | `/api/ai/treatment` | `/ai/treatment` |
| `app/doctor/scan/[id]/page.tsx` | `/api/ai/report` | `/ai/report` |
| `app/doctor/scan/[id]/page.tsx` | `/api/reports` | `/reports` |
| `app/doctor/scan/[id]/page.tsx` | `/api/reports/${id}` | `/reports/${id}` |
| `app/doctor/scan/[id]/page.tsx` | `/api/send-report-email` | `/communications/email` |
| `app/doctor/scan/[id]/page.tsx` | `/api/call-reminder` | `/communications/call` |
| `app/doctor/scan/new/page.tsx` | `/api/upload` | `/scans/upload` |
| `app/doctor/patients/page.tsx` | `/api/users/patients` | `/users/patients` |
| `app/doctor/patients/[id]/page.tsx` | `/api/doctor/patients/${id}` | `/doctor/patients/${id}` |
| `app/doctor/prescriptions/page.tsx` | `/api/users/patients` | `/users/patients` |
| `app/doctor/prescriptions/page.tsx` | `/api/medications` | `/medications` |
| `app/doctor/prescriptions/page.tsx` | `/api/medications/${id}` | `/medications/${id}` |
| `app/doctor/prescriptions/page.tsx` | `/api/exercises` | `/exercises` |
| `app/doctor/prescriptions/page.tsx` | `/api/exercises/${id}` | `/exercises/${id}` |
| `app/doctor/scan/prescriptions/page.tsx` | `/api/ocr` | `/ocr/process` |
| `app/doctor/scan/prescriptions/page.tsx` | `/api/ocr/save` | `/ocr/save` |
| `app/doctor/profile/page.tsx` | `/api/doctor/profile` | `/doctor/profile` |
| `app/doctor/developer/page.tsx` | `/api/developer/keys` | `/developer/keys` |
| `app/patient/page.tsx` | `/api/analytics` | `/analytics` |
| `app/patient/scans/page.tsx` | `/api/scans` | `/scans` |
| `app/patient/scans/[id]/page.tsx` | `/api/scans/${id}` | `/scans/${id}` |
| `app/patient/scans/[id]/page.tsx` | `/api/reports` | `/reports` |
| `app/patient/upload/page.tsx` | `/api/upload` | `/scans/upload` |
| `app/patient/upload-prescription/page.tsx` | `/api/ocr` | `/ocr/process` |
| `app/patient/upload-prescription/page.tsx` | `/api/ocr/save` | `/ocr/save` |
| `app/patient/medications/page.tsx` | `/api/medications` | `/medications` |
| `app/patient/medications/page.tsx` | `/api/medications/${id}` | `/medications/${id}` |
| `app/patient/medications/page.tsx` | `/api/medications/log` | `/medications/log` |
| `app/patient/exercise/page.tsx` | `/api/exercises` | `/exercises` |
| `app/patient/exercise/page.tsx` | `/api/exercises/${id}` | `/exercises/${id}` |
| `app/patient/exercise/page.tsx` | `/api/exercises/log` | `/exercises/log` |
| `app/patient/family/page.tsx` | `/api/family` | `/family` |
| `app/patient/reports/[id]/page.tsx` | `/api/reports/${id}` | `/reports/${id}` |
| `components/layout/TopNav.tsx` | `/api/notifications` | `/notifications` |
| `components/layout/TopNav.tsx` | `/api/notifications` PATCH | `/notifications` |
| `components/chat/ChatView.tsx` | `/api/conversations` | `/conversations` |
| `components/chat/ChatView.tsx` | `/api/conversations/${id}/messages` | `/conversations/${id}/messages` |
| `components/chat/ChatView.tsx` | `/api/ai/suggest` | `/ai/suggest` |
| `components/appointments/AppointmentView.tsx` | `/api/appointments` | `/appointments` |
| `components/reports/ReportList.tsx` | `/api/reports` | `/reports` |
| `components/research/ResearchPage.tsx` | `/api/research` | `/research/ask` |
| `components/research/ResearchPage.tsx` | `/api/research/stats` | `/research/stats` |
| `components/VoiceNote.tsx` | `/api/voice-notes` | `/voice-notes` |

**Pattern for making the change** (same in every file, only the URL string changes):

```typescript
// BEFORE — in any "use client" component:
const res = await fetch("/api/scans");
const data = await res.json();

// AFTER — add token from useAuth():
import { useAuth } from "@clerk/nextjs";
const { getToken } = useAuth();
const token = await getToken();
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const res = await fetch(`${BACKEND}/scans`, {
  headers: { Authorization: `Bearer ${token}` },
});
const data = await res.json();
```

For **server components** (e.g., `app/dashboard/page.tsx`):

```typescript
// BEFORE:
import { auth } from "@clerk/nextjs/server";
const { userId } = await auth();
const user = await db.query.users.findFirst(...); // Direct DB access — REMOVE THIS

// AFTER:
import { serverFetch } from "@/lib/api/client";
const res = await serverFetch("/users/me");
const { user } = await res.json();
```

---

### 5.8 `frontend/next.config.mjs`

Add a rewrite so that `/public/heatmaps/...` and `/public/uploads/...` URLs embedded in scan results are proxied from FastAPI transparently:

```javascript
// frontend/next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    return [
      // Proxy all static files served by FastAPI
      {
        source: "/public/:path*",
        destination: `${backendUrl}/public/:path*`,
      },
    ];
  },
};

export default nextConfig;
```

This means existing UI code that renders `<img src="/public/heatmaps/heatmap_xyz.png" />` or `/public/uploads/scan.jpg` continues to work without any changes to the component files.

---

### 5.9 `frontend/package.json` Changes

**Remove** (no longer needed in frontend — DB is accessed only via FastAPI now):
```json
"better-sqlite3": "...",
```

**Remove scripts:**
```json
"db:push": "...",
```

**Keep** (still needed for schema management and future migration):
```json
"drizzle-orm": "...",
"drizzle-kit": "..."
```

**Keep scripts:**
```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:seed": "tsx scripts/seed.ts"
```

**Add new env var to `.env.local`:**
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# DB path used only by Drizzle CLI (not at runtime)
DB_PATH=../backend/data/vaidyavision.db
```

---

## 6. Phase 3 — File Migration Checklist

### Files that MOVE (delete from old location, create in new):

```
medical-ai-platform/ml-service/          → backend/ml/           (rename, zero changes)
medical-ai-platform/data/vaidyavision.db → backend/data/vaidyavision.db
medical-ai-platform/public/uploads/      → backend/public/uploads/
medical-ai-platform/public/heatmaps/     → backend/public/heatmaps/
```

### Files that COPY to `frontend/` (unchanged, same relative path):

```
app/(marketing)/         → frontend/app/(marketing)/
app/sign-in/             → frontend/app/sign-in/
app/sign-up/             → frontend/app/sign-up/
app/onboarding/page.tsx  → frontend/app/onboarding/page.tsx   (then update fetch URLs)
app/dashboard/page.tsx   → frontend/app/dashboard/page.tsx    (then update fetch URLs)
app/doctor/              → frontend/app/doctor/               (then update fetch URLs)
app/patient/             → frontend/app/patient/              (then update fetch URLs)
app/layout.tsx           → frontend/app/layout.tsx
app/globals.css          → frontend/app/globals.css
app/not-found.tsx        → frontend/app/not-found.tsx
components/              → frontend/components/               (then update fetch URLs)
lib/utils.ts             → frontend/lib/utils.ts
lib/db/schema.ts         → frontend/lib/db/schema.ts          (UNCHANGED)
lib/db/index.ts          → frontend/lib/db/index.ts           (update DB path)
drizzle/                 → frontend/drizzle/
scripts/seed.ts          → frontend/scripts/seed.ts           (UNCHANGED)
public/icons/            → frontend/public/icons/
public/images/           → frontend/public/images/
tailwind.config.ts       → frontend/tailwind.config.ts
middleware.ts            → frontend/middleware.ts
package.json             → frontend/package.json              (remove better-sqlite3)
tsconfig.json            → frontend/tsconfig.json
next.config.mjs          → frontend/next.config.mjs           (add proxy rewrite)
drizzle.config.ts        → frontend/drizzle.config.ts         (update DB path)
```

### Files that DO NOT MOVE (deleted — logic is now in FastAPI):

```
medical-ai-platform/app/api/             ← DELETE ENTIRELY
```

### Files that are NEW (created from scratch):

```
backend/main.py
backend/requirements.txt
backend/.env.example
backend/core/__init__.py
backend/core/config.py
backend/core/database.py
backend/core/auth.py
backend/models/__init__.py
backend/models/types.py
backend/routers/__init__.py
backend/routers/users.py
backend/routers/scans.py
backend/routers/reports.py
backend/routers/appointments.py
backend/routers/conversations.py
backend/routers/medications.py
backend/routers/exercises.py
backend/routers/notifications.py
backend/routers/analytics.py
backend/routers/family.py
backend/routers/developer.py
backend/routers/doctor.py
backend/routers/ai.py
backend/routers/communications.py
backend/routers/followups.py
backend/routers/voice_notes.py
backend/routers/ocr_routes.py
frontend/lib/api/client.ts
frontend/lib/api/users.ts
frontend/lib/api/scans.ts
frontend/lib/api/reports.ts
frontend/lib/api/appointments.ts
frontend/lib/api/conversations.ts
frontend/lib/api/medications.ts
frontend/lib/api/exercises.ts
frontend/lib/api/notifications.ts
frontend/lib/api/analytics.ts
frontend/lib/api/family.ts
frontend/lib/api/doctor.ts
frontend/lib/api/ai.ts
frontend/lib/api/communications.ts
frontend/lib/api/ocr.ts
frontend/lib/api/research.ts
frontend/lib/api/developer.ts
frontend/.env.local.example
```

---

## 7. Phase 4 — Implementation Order

Execute strictly in this order. Do not skip steps.

**Step 0** — Back up the entire `medical-ai-platform/` directory before touching anything.

**Step 1** — Create the `backend/` directory with all empty `__init__.py` files and subdirectory structure.

**Step 2** — Copy `ml-service/` to `backend/ml/` with no changes.

**Step 3** — Copy `data/vaidyavision.db` to `backend/data/vaidyavision.db`.

**Step 4** — Copy `public/uploads/` and `public/heatmaps/` to `backend/public/`.

**Step 5** — Implement `backend/core/config.py`.

**Step 6** — Implement `backend/core/database.py`.

**Step 7** — Implement `backend/core/auth.py`.

**Step 8** — Implement `backend/models/types.py`.

**Step 9** — Implement all router files in `backend/routers/`, one by one. After each router, verify that the SQL column names in queries match those in `drizzle/0000_sour_logan.sql` exactly (e.g., `clerk_id` not `clerkId`, `uploaded_at` not `uploadedAt`).

**Step 10** — Implement `backend/main.py`.

**Step 11** — Install dependencies: `pip install -r requirements.txt`.

**Step 12** — Start the backend: `uvicorn main:app --reload --port 8000`. Open `http://localhost:8000/docs` and verify every endpoint appears with the correct path and method.

**Step 13** — Create the `frontend/` directory.

**Step 14** — Copy all UI files from `medical-ai-platform/` to `frontend/` (see checklist in Phase 3). Do **not** copy `app/api/`.

**Step 15** — Update `frontend/lib/db/index.ts` (new DB path).

**Step 16** — Update `frontend/drizzle.config.ts` (new DB path).

**Step 17** — Create `frontend/lib/api/client.ts` and all typed API files.

**Step 18** — Go through every file listed in the URL Replacement Map (Section 5.7) and update each `fetch("/api/...")` call to point to the backend. Add `useAuth` token retrieval wherever it is missing. This is the most tedious step — take it file by file.

**Step 19** — Update `frontend/next.config.mjs` with the `/public/:path*` rewrite.

**Step 20** — Update `frontend/package.json` (remove `better-sqlite3`, keep Drizzle).

**Step 21** — Create `frontend/.env.local` with Clerk keys and `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000`.

**Step 22** — `npm install` in `frontend/`.

**Step 23** — `npm run dev` in `frontend/`. Navigate to every page and verify it loads correctly and all API calls succeed (check browser Network tab).

**Step 24** — Run `npx drizzle-kit generate` from `frontend/` to confirm Drizzle can still read the schema and connect to the DB. This proves the migration path to PostgreSQL is intact.

---

## 8. Phase 5 — Running the New Setup

```bash
# Terminal 1 — Backend (all business logic, ML, DB access)
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Interactive API docs:
# http://localhost:8000/docs

# Terminal 2 — Frontend (UI only, calls backend)
cd frontend
npm install
npm run dev
# http://localhost:3000

# Seeding the database (from frontend — Drizzle has DB access):
cd frontend
npm run db:seed
```

**Environment summary:**

| What | Where runs | DB access | Auth |
|---|---|---|---|
| FastAPI backend | Port 8000 | Direct sqlite3 | Verifies Clerk JWT |
| Next.js frontend | Port 3000 | Only via Drizzle CLI (migrations) | Clerk handles sessions |
| ML inference | Inside FastAPI | None | Inherited from FastAPI |

---

## 9. Future: Porting to PostgreSQL

When you are ready to move from SQLite to PostgreSQL, this restructuring makes it a clean 4-step process:

**Step 1** — Update `frontend/drizzle.config.ts`:
```typescript
export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  driver: "pg",  // change from "better-sqlite"
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

**Step 2** — Run migrations from `frontend/`:
```bash
npx drizzle-kit generate   # generates new SQL migration for Postgres
npx drizzle-kit migrate    # applies to the Postgres DB
```

**Step 3** — Update `backend/core/database.py` to use `psycopg2`:
```python
import psycopg2
import psycopg2.extras

def get_connection():
    conn = psycopg2.connect(settings.DATABASE_URL)
    conn.cursor_factory = psycopg2.extras.RealDictCursor
    return conn
```

**Step 4** — Update `backend/.env`:
```env
DATABASE_URL=postgresql://user:password@host:5432/vaidyavision
```

The raw SQL queries in all router files require zero changes because they use standard SQL that works in both SQLite and PostgreSQL.

---

*Document version: 1.0 | Generated for VaidyaVision restructuring*
