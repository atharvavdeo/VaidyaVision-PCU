<p align="center">
  <img src="public/icons/logo.png" alt="VaidyaVision Logo" width="80" />
</p>

<h1 align="center">VaidyaVision - AI-Powered Medical Diagnostic Platform</h1>

<p align="center">
  <strong>Intelligent medical imaging analysis with real-time ML inference, GradCAM explainability, and automated clinical workflows</strong>
</p>

<p align="center">
  <em>Built for HackVision Hackathon - IIIT Pune</em>
</p>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [ML Pipeline - Deep Dive](#ml-pipeline--deep-dive)
  - [Modality Router](#modality-router)
  - [Expert Models](#expert-models)
  - [Inference Flow](#inference-flow)
  - [GradCAM Explainability](#gradcam-explainability)
  - [MC Dropout Uncertainty](#mc-dropout-uncertainty-estimation)
- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [API Routes Reference](#api-routes-reference)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Installation](#installation)
  - [Running the Platform](#running-the-platform)
- [User Workflows](#user-workflows)
- [Diagnostic Classes Reference](#diagnostic-classes-reference)
- [Design System](#design-system)
- [Notes and Limitations](#notes--limitations)
- [Team](#team)

---

## Overview

**VaidyaVision** (the doctor's vision) is a full-stack AI-powered medical diagnostics platform that combines deep learning-based image analysis with clinical workflow automation. The system enables:

1. **Patients** to upload medical scans (Brain MRI, Chest X-Ray, Skin Dermoscopy, ECG) and receive AI-triaged results
2. **Doctors** to review AI predictions with GradCAM heatmap overlays, generate LLM-powered clinical reports, prescribe treatment plans, and communicate with patients
3. **Automated workflows** for appointment scheduling, follow-up reminders (Twilio voice calls), and report delivery (Resend email)

The platform employs a **Mixture-of-Experts (MoE)** architecture with a routing network that automatically classifies the scan modality and delegates to the appropriate domain-specific expert model - each independently trained for maximum accuracy.

---

## Key Features

| Category | Feature | Details |
|----------|---------|---------|
| **AI Diagnostics** | Multi-modal scan analysis | Brain tumors, lung diseases, skin conditions, ECG abnormalities |
| **Explainability** | GradCAM heatmaps | Visual attention maps overlaid on original scans |
| **Uncertainty** | MC Dropout estimation | 25-sample Monte Carlo for confidence calibration |
| **Routing** | Automatic modality detection | ResNet34-based router classifies scan type |
| **Reports** | LLM-generated clinical reports | Groq (Llama 3.3 70B) generates structured findings |
| **Treatment Plans** | AI-suggested treatment | Medications, tests, referrals, lifestyle changes |
| **Email** | Automated report delivery | Resend API sends scan results to patients |
| **Voice Calls** | Follow-up reminders | Twilio voice calls with TwiML confirmation flow |
| **Messaging** | Real-time patient-doctor chat | Cross-connected conversations with AI-suggested replies |
| **Appointments** | Scheduling system | Book, confirm, cancel with automated reminders |
| **Family** | Family member management | Patients can manage dependents' health records |
| **Voice Notes** | Web Speech API dictation | Doctors dictate notes directly on scan reviews |
| **Auth** | Clerk SSO | Role-based access (patient / doctor / admin) |
| **Responsive** | Mobile-first UI | Framer Motion animations, Spline 3D backgrounds |

---

## System Architecture

```
+------------------------------------------------------------------+
|                        CLIENT (Browser)                          |
|  Next.js 14 App Router  .  React 18  .  Tailwind CSS            |
|  Clerk Auth  .  Framer Motion  .  Recharts  .  Spline 3D        |
+----------------------------+-------------------------------------+
                             | HTTPS / REST
                             v
+------------------------------------------------------------------+
|                    NEXT.JS API ROUTES (Port 3000)                |
|                                                                  |
|  /api/upload        -> Save scan image + create DB record        |
|  /api/scans         -> CRUD operations on scans                  |
|  /api/predict       -> Proxy to ML service                       |
|  /api/ai/report     -> Groq LLM report generation               |
|  /api/ai/treatment  -> Groq LLM treatment plan                  |
|  /api/reports       -> Create/retrieve clinical reports          |
|  /api/conversations -> Patient-doctor messaging                  |
|  /api/appointments  -> Scheduling & management                   |
|  /api/send-report-email -> Resend email delivery                 |
|  /api/call-reminder     -> Twilio voice call trigger             |
|  /api/twiml-reminder    -> TwiML voice response XML              |
|  /api/twiml-confirm     -> TwiML digit confirmation              |
|  /api/users         -> User management (patients, doctors)       |
|  /api/notifications -> In-app notification system                |
|  /api/analytics     -> Dashboard statistics                      |
|  /api/family        -> Family member management                  |
|  /api/voice-notes   -> Voice dictation storage                   |
|                                                                  |
+------+---------------+------------------+-----------------------+
       |               |                  |
       v               v                  v
+--------------+ +--------------+  +----------------+
|  ML Service  | |   Groq AI    |  |  External APIs |
|  (Port 8000) | | (LLM Cloud)  |  |                |
|              | |              |  | . Resend Email  |
|  FastAPI     | | llama-3.3    |  | . Twilio Voice  |
|  PyTorch     | | 70B Versatile|  | . Clerk Auth    |
|  GradCAM     | |              |  |                |
+------+-------+ +--------------+  +----------------+
       |
       v
+------------------------------------------------------------------+
|                    ML INFERENCE PIPELINE                          |
|                                                                  |
|  +---------------+    +--------------------------------------+   |
|  | ModalityRouter|--->|        Expert Selection              |   |
|  |  (ResNet34)   |    |                                      |   |
|  +---------------+    |  +-------------+  +--------------+   |   |
|                       |  |BrainExpert  |  | LungExpert   |   |   |
|                       |  |EfficientNet |  | DenseNet121  |   |   |
|                       |  |   -B2       |  |              |   |   |
|                       |  | 4 classes   |  | 5 classes    |   |   |
|                       |  +-------------+  +--------------+   |   |
|                       |  +-------------+  +--------------+   |   |
|                       |  |SkinExpert   |  | ECGExpert    |   |   |
|                       |  | ResNet50    |  | EfficientNet |   |   |
|                       |  |             |  |    -B0       |   |   |
|                       |  | 9 classes   |  | 4 classes    |   |   |
|                       |  +-------------+  +--------------+   |   |
|                       +--------------------------------------+   |
|                              |                                   |
|                              v                                   |
|                   +--------------------+                         |
|                   |  MC Dropout (25x)  |                         |
|                   |  + GradCAM         |                         |
|                   |  + Triage Score    |                         |
|                   +--------------------+                         |
+------------------------------------------------------------------+
       |
       v
+------------------------------------------------------------------+
|                     SQLite DATABASE (WAL Mode)                   |
|                     Drizzle ORM + better-sqlite3                 |
|                                                                  |
|  Tables: users, doctor_profiles, scans, reports, conversations,  |
|          messages, appointments, templates, notifications,       |
|          family_members, follow_ups, voice_notes                 |
+------------------------------------------------------------------+
```

---

## ML Pipeline - Deep Dive

### Modality Router

The first stage of inference automatically classifies the type of medical scan:

| Component | Architecture | Task |
|-----------|-------------|------|
| **ModalityRouter** | ResNet34 | Classifies input as `brain` / `lung` / `skin` / `ecg` |

The router's output index maps to the modality, which selects the appropriate expert model. Doctors can also **force** a specific modality to bypass auto-routing.

### Expert Models

| Expert | Backbone | Classes | Conditions Detected |
|--------|----------|---------|---------------------|
| **BrainExpert** | EfficientNet-B2 (timm) | 4 | Glioma, Meningioma, No Tumor, Pituitary Tumor |
| **LungExpert** | DenseNet121 (torchvision) | 5 | Bacterial Pneumonia, COVID-19, Normal, Tuberculosis, Viral Pneumonia |
| **SkinExpert** | ResNet50 (torchvision) | 9 | Actinic Keratosis, Basal Cell Carcinoma, Benign Keratosis, Dermatofibroma, Melanocytic Nevi, Melanoma, Squamous Cell Carcinoma, Vascular Lesion, Unknown |
| **ECGExpert** | EfficientNet-B0 (timm) | 4 | Abnormal Heartbeat, Myocardial Infarction, Normal, History of MI |

Each expert follows a shared architecture pattern:
```
Backbone (pretrained, feature extraction)
    -> Global Average Pooling
    -> Linear(feature_dim, 512)
    -> BatchNorm1d(512)
    -> Activation (Hardswish / ReLU)
    -> Dropout(p=0.3-0.45)
    -> Linear(512, num_classes)
```

### Inference Flow

```
Input Image (any size)
    |
    v
Preprocessing: Resize(224x224) -> ToTensor -> ImageNet Normalize
    |
    v
ModalityRouter -> argmax -> modality in {brain, lung, skin, ecg}
    |
    v
Expert[modality] -> MC Dropout (25 forward passes with dropout active)
    |
    v
Mean Prediction = avg(softmax outputs across 25 passes)
Uncertainty = mean(std across 25 passes)
    |
    +-- if uncertainty > 0.15 -> REJECTED (flagged for manual review)
    |
    +-- if uncertainty <= 0.15 -> ACCEPTED
            |
            v
        Triage Score = int(confidence x 70 + (1 - uncertainty) x 30)
            |
            v
        GradCAM Heatmap Generation -> Overlay on Original
            |
            v
        Save heatmap to /public/heatmaps/ -> Return URL + predictions
```

### GradCAM Explainability

**Gradient-weighted Class Activation Mapping** provides visual explanations of model predictions:

- **Target layers** per architecture:
  - Brain (EfficientNet-B2): `backbone.conv_head`
  - Lung (DenseNet121): `backbone.features.denseblock4`
  - Skin (ResNet50): `backbone.layer4[-1]`
  - ECG (EfficientNet-B0): `backbone.conv_head`

- **Process**: Forward hook captures activations -> Backward hook captures gradients -> Global Average Pooling of gradients -> Weighted sum of activation maps -> ReLU -> Normalize -> Resize to 224x224 -> JET colormap -> 50% overlay on original image

### MC Dropout Uncertainty Estimation

Monte Carlo Dropout provides Bayesian-approximate uncertainty estimates:

1. Set model to `eval()` mode but keep `Dropout` layers in `train()` mode
2. Run 25 stochastic forward passes
3. Compute mean prediction (ensemble average) and standard deviation
4. If mean uncertainty > **0.15** threshold -> reject prediction with `REJECTED` status
5. This catches out-of-distribution inputs and ambiguous cases

---

## Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| **Next.js 14** (App Router) | React framework with SSR/SSG |
| **TypeScript** | Type-safe development |
| **Tailwind CSS** | Utility-first styling (custom olive/sage/cream medical palette) |
| **Framer Motion** | Page transitions and micro-animations |
| **Recharts** | Dashboard analytics charts |
| **Lucide React** | Icon library |
| **Spline** | 3D animated backgrounds on landing page |
| **SWR** | Data fetching with caching |
| **jsPDF** | Client-side PDF generation |
| **@react-pdf/renderer** | React-based PDF rendering |

### Backend
| Technology | Purpose |
|-----------|---------|
| **Next.js API Routes** | REST API endpoints |
| **Drizzle ORM** | Type-safe SQL query builder |
| **better-sqlite3** | SQLite driver (WAL mode for concurrency) |
| **Clerk** | Authentication & user management (SSO, RBAC) |

### ML Service
| Technology | Purpose |
|-----------|---------|
| **FastAPI** | High-performance Python API server |
| **PyTorch** | Deep learning framework |
| **timm** | Pre-trained model zoo (EfficientNet variants) |
| **torchvision** | Model architectures (ResNet, DenseNet) |
| **OpenCV** | Image processing & heatmap generation |
| **Pillow** | Image loading and transformation |
| **uvicorn** | ASGI server |

### External Services
| Service | Purpose |
|---------|---------|
| **Groq** (Llama 3.3 70B Versatile) | LLM for report generation & treatment plans |
| **Resend** | Transactional email delivery |
| **Twilio** | Voice call reminders with TwiML IVR flow |
| **Clerk** | OAuth/SSO authentication provider |

---

## Database Schema

The platform uses **SQLite** with Drizzle ORM. 12 tables with full relational integrity:

```
+---------------------+
|       users          | <- Clerk-backed identity
+---------------------+    Roles: patient | doctor | admin
| id, clerkId, role    |    Demographics: age, gender, bloodType
| name, email, phone   |    Medical: medicalHistory
| specialty (doctor)   |
+---------+-----------+
          |
     +----+------------------------------------+
     |              |              |            |
     v              v              v            v
+---------+  +-----------+  +----------+  +------------+
|  scans   |  |appointments|  |messages  |  |notifications|
|          |  |            |  |          |  |            |
| modality |  | scheduled  |  | conv_id  |  | type       |
| AI dx    |  | type       |  | content  |  | message    |
| heatmap  |  | status     |  | sender   |  | isRead     |
+----+-----+  +-----------+  +----------+  +------------+
     |
     +--------------+----------------+
     v              v                v
+---------+  +-----------+  +------------+
| reports  |  | follow_ups |  | voice_notes|
|          |  |            |  |            |
| findings |  | type: call |  |transcription|
| severity |  |  / email   |  |            |
| pdfUrl   |  | status     |  |            |
+----------+  +------------+  +------------+
```

**Additional tables:** `doctor_profiles`, `conversations`, `templates`, `family_members`

---

## API Routes Reference

### Scan & ML Pipeline
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/upload` | Upload scan image (multipart/form-data) |
| `GET` | `/api/scans` | List scans (filtered by patient/doctor) |
| `GET` | `/api/scans/[id]` | Get single scan details |
| `PATCH` | `/api/scans/[id]` | Update scan (AI results, doctor notes, status) |
| `POST` | `/api/predict` | Proxy to ML service for inference |

### AI / LLM
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/ai/report` | Generate clinical report via Groq LLM |
| `POST` | `/api/ai/treatment` | Generate treatment plan via Groq LLM |
| `POST` | `/api/ai/chat-suggest` | AI-suggested chat replies |

### Reports
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/reports` | Create and save clinical report |
| `GET` | `/api/reports` | List reports |
| `GET` | `/api/reports/[id]` | Get report by ID |

### Communication
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/send-report-email` | Email report to patient via Resend |
| `POST` | `/api/call-reminder` | Trigger Twilio voice call |
| `POST` | `/api/twiml-reminder` | TwiML voice XML (greeting) |
| `POST` | `/api/twiml-confirm` | TwiML DTMF confirmation handler |
| `GET/POST` | `/api/conversations` | Doctor-patient chat threads |
| `GET/POST` | `/api/conversations/[id]/messages` | Individual messages |

### Users & Scheduling
| Method | Route | Description |
|--------|-------|-------------|
| `GET/POST` | `/api/users/patients` | List/create patients |
| `GET` | `/api/doctor/profile` | Doctor profile info |
| `GET/POST` | `/api/appointments` | Manage appointments |
| `POST` | `/api/schedule-followup` | Schedule automated follow-ups |
| `GET/POST` | `/api/family` | Family member management |
| `GET` | `/api/analytics` | Dashboard statistics |
| `GET/POST` | `/api/notifications` | In-app notifications |
| `POST` | `/api/voice-notes` | Save voice dictation |

---

## Project Structure

```
medical-ai-platform/
|
+-- app/                          # Next.js App Router
|   +-- layout.tsx                # Root layout with Clerk provider
|   +-- globals.css               # Tailwind + custom CSS
|   +-- (marketing)/              # Landing page (public)
|   |   +-- page.tsx              # Hero + feature sections
|   |   +-- sections/             # Marketing page sections
|   +-- (auth)/                   # Auth pages
|   |   +-- login/
|   |   +-- register/
|   +-- sign-in/[[...sign-in]]/   # Clerk sign-in
|   +-- sign-up/[[...sign-up]]/   # Clerk sign-up
|   +-- onboarding/               # Post-registration onboarding
|   |
|   +-- patient/                  # Patient dashboard
|   |   +-- page.tsx              # Overview with stats
|   |   +-- layout.tsx            # Sidebar + TopNav
|   |   +-- upload/               # Upload scans
|   |   +-- scans/                # View scan results
|   |   +-- appointments/         # Manage appointments
|   |   +-- messages/             # Chat with doctor
|   |   +-- family/               # Family members
|   |
|   +-- doctor/                   # Doctor dashboard
|   |   +-- page.tsx              # Overview with analytics
|   |   +-- layout.tsx            # Sidebar + TopNav
|   |   +-- scan/[id]/            # Review scan + Run ML + Generate Report
|   |   +-- patients/             # Patient list + Add Patient
|   |   +-- reports/              # Manage reports
|   |   +-- appointments/         # Appointment queue
|   |   +-- messages/             # Patient messaging
|   |   +-- queue/                # Scan review queue
|   |   +-- profile/              # Doctor profile
|   |
|   +-- api/                      # API routes (see reference above)
|
+-- components/                   # Shared React components
|   +-- layout/
|   |   +-- Sidebar.tsx           # App sidebar navigation
|   |   +-- TopNav.tsx            # Top navigation bar
|   +-- chat/ChatView.tsx         # Real-time messaging
|   +-- appointments/             # Appointment components
|   +-- reports/ReportList.tsx    # Report listing
|   +-- VoiceNote.tsx             # Voice dictation component
|   +-- marketing/               # Landing page components
|       +-- Navbar.tsx
|       +-- Footer.tsx
|       +-- SplineBackground.tsx  # 3D animated background
|       +-- Marquee.tsx
|       +-- MouseFollower.tsx
|       +-- FullScreenMenu.tsx
|
+-- lib/
|   +-- db/
|   |   +-- schema.ts             # Drizzle schema (12 tables)
|   |   +-- index.ts              # Database connection (WAL mode)
|   +-- utils.ts                  # Utility functions (cn)
|
+-- ml-service/                   # Python ML backend
|   +-- server.py                 # FastAPI server (port 8000)
|   +-- inference.py              # Full inference pipeline
|   +-- model_defs.py             # PyTorch model architectures
|   +-- requirements.txt          # Python dependencies
|   +-- iiit-pune.ipynb           # Training notebook
|   +-- models/                   # Trained model weights (~255 MB)
|       +-- best_ModalityRouter.pth
|       +-- best_BrainExpert.pth
|       +-- best_LungExpert.pth
|       +-- best_SkinExpert.pth
|       +-- best_ECGExpert.pth
|
+-- drizzle/                      # Database migrations
|   +-- 0000_sour_logan.sql       # Initial schema migration
|
+-- scripts/
|   +-- seed.ts                   # Database seeder (demo data)
|   +-- test_backend.js           # Backend API tests
|
+-- public/
|   +-- heatmaps/                 # Generated GradCAM heatmaps
|   +-- uploads/                  # Uploaded scan images
|   +-- images/                   # Static images
|   +-- icons/                    # App icons
|
+-- docs/                         # Documentation
|   +-- SYSTEM_SUMMARY.md
|   +-- MODEL_ARCHITECTURE.md
|   +-- ML_CONTRACT.md
|   +-- VISUAL_RAG_LOGIC.md
|   +-- SCAN_REVIEW_WORKFLOW.md
|   +-- ...
|
+-- next.config.mjs               # Next.js configuration
+-- tailwind.config.ts            # Tailwind (medical color palette)
+-- drizzle.config.ts             # Drizzle ORM config
+-- middleware.ts                 # Clerk auth middleware
+-- tsconfig.json                 # TypeScript config
+-- package.json                  # Node.js dependencies
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **Python** >= 3.9 (with PyTorch support - Anaconda recommended)
- **Clerk** account (free tier works)
- **Groq** API key (free tier: 30 RPM)
- **Resend** API key (free tier: 100 emails/day)
- **Twilio** account (optional - for voice calls)

### Environment Variables

Create `.env.local` in the project root:

```bash
# ====== Clerk Authentication ======
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/onboarding
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# ====== Groq AI (LLM) ======
GROQ_API_KEY=gsk_...

# ====== Resend (Email) ======
RESEND_API_KEY=re_...

# ====== Twilio (Voice Calls) ======
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...    # Your Twilio phone number

# ====== App Config ======
NEXT_PUBLIC_APP_URL=http://localhost:3000
ML_SERVICE_URL=http://localhost:8000
```

### Installation

**1. Frontend (Next.js)**

```bash
cd medical-ai-platform
npm install
```

**2. Database Setup**

```bash
# Push schema to SQLite
npm run db:push

# Seed with demo data (5 patients, 2 doctors, 10 scans, reports, appointments)
npm run db:seed
```

**3. ML Service (Python)**

```bash
cd ml-service

# Using conda (recommended)
conda activate base
pip install -r requirements.txt

# Verify model weights exist
ls -la models/
# Expected: best_BrainExpert.pth, best_LungExpert.pth,
#           best_SkinExpert.pth, best_ECGExpert.pth,
#           best_ModalityRouter.pth (total ~255 MB)
```

### Running the Platform

**Terminal 1 - ML Service:**
```bash
cd ml-service
python server.py
# -> FastAPI running on http://localhost:8000
# -> Health check: GET http://localhost:8000/
```

**Terminal 2 - Next.js Frontend:**
```bash
cd medical-ai-platform
npm run dev
# -> Next.js running on http://localhost:3000
```

**Verify both services:**
```bash
# ML Service health
curl http://localhost:8000/
# -> {"status":"online","service":"VaidyaVision ML"}

# Frontend
open http://localhost:3000
```

---

## User Workflows

### Patient Flow
```
Sign Up -> Onboarding (demographics) -> Dashboard
    |
    +-- Upload Scan -> Select modality -> AI auto-triages
    +-- View Scans -> See AI results + heatmaps + reports
    +-- Messages -> Chat with assigned doctor
    +-- Appointments -> View/manage scheduled visits
    +-- Family -> Add dependents and their health records
```

### Doctor Flow
```
Sign In -> Doctor Dashboard (analytics overview)
    |
    +-- Scan Queue -> See pending scans (priority-sorted)
    |     +-- Click scan -> Review Page:
    |           +-- "Run ML Analysis" -> real-time inference
    |           +-- View GradCAM heatmap overlay
    |           +-- Generate AI Report (Groq LLM)
    |           +-- Generate Treatment Plan
    |           +-- Email patient report
    |           +-- Call patient (Twilio)
    |           +-- Voice notes (dictation)
    |           +-- Save notes & mark complete
    |
    +-- Patients -> List + Quick Add Patient (modal)
    +-- Messages -> Patient conversations
    +-- Reports -> All generated reports
    +-- Appointments -> Schedule & manage
    +-- Profile -> Edit qualifications
```

### ML Inference Flow (Doctor Scan Page)
```
Doctor clicks "Run ML Analysis Now"
    |
    v
Frontend fetches scan image as blob
    |
    v
POST to http://localhost:8000/predict (multipart/form-data)
    |
    v
ML Server:
    +-- ModalityRouter classifies scan type
    +-- Routes to appropriate Expert model
    +-- Runs 25 MC Dropout forward passes
    +-- Computes mean prediction + uncertainty
    +-- Generates GradCAM heatmap
    +-- Saves heatmap to /public/heatmaps/
    +-- Returns: diagnosis, confidence, uncertainty, triage_score, heatmap_url
    |
    v
Frontend PATCHes /api/scans/{id} with AI results
    |
    v
Page refreshes to show results + heatmap + action buttons
```

---

## Diagnostic Classes Reference

### Brain (4 classes)
| Index | Diagnosis |
|-------|-----------|
| 0 | Glioma Tumor |
| 1 | Meningioma Tumor |
| 2 | No Tumor |
| 3 | Pituitary Tumor |

### Lung (5 classes)
| Index | Diagnosis |
|-------|-----------|
| 0 | Bacterial Pneumonia |
| 1 | COVID-19 |
| 2 | Normal |
| 3 | Tuberculosis |
| 4 | Viral Pneumonia |

### Skin (9 classes)
| Index | Diagnosis |
|-------|-----------|
| 0 | Actinic Keratosis |
| 1 | Basal Cell Carcinoma |
| 2 | Benign Keratosis |
| 3 | Dermatofibroma |
| 4 | Melanocytic Nevi |
| 5 | Melanoma |
| 6 | Squamous Cell Carcinoma |
| 7 | Vascular Lesion |
| 8 | Unknown |

### ECG (4 classes)
| Index | Diagnosis |
|-------|-----------|
| 0 | Abnormal Heartbeat |
| 1 | Myocardial Infarction |
| 2 | Normal |
| 3 | History of MI |

---

## Design System

The platform uses a custom **medical-grade color palette**:

| Token | Color | Usage |
|-------|-------|-------|
| `olive-900` | `#3d3d2e` | Primary text, sidebar |
| `sage-100` | `#e8e5d8` | Backgrounds |
| `cream-50` | `#faf8f0` | Card backgrounds |
| `medical` (emerald) | `#10b981` | Success, primary actions |
| `amber-500` | `#f59e0b` | Warnings, medium priority |
| `red-500` | `#ef4444` | Errors, critical alerts |

Typography uses system font stack with `font-light` aesthetic. Animations powered by **Framer Motion** with staggered children patterns.

---

## Notes & Limitations

- **Twilio**: Requires a purchased phone number for outbound calls. Test mode uses sandbox number.
- **Resend**: Free tier sends from `onboarding@resend.dev`. Custom domain required for branded sender.
- **ML Models**: Require ~255 MB of model weight files in `ml-service/models/`. Not included in git - must be trained separately using `iiit-pune.ipynb`.
- **Database**: Uses SQLite (single-file) - suitable for hackathon demo. For production, migrate to PostgreSQL.
- **GradCAM**: Works best when scan is clearly a single modality. Ambiguous images may produce noisy heatmaps.

---

## Team

Built at **HackVision - IIIT Pune**

---

<p align="center">
  <strong>VaidyaVision</strong> - <em>Because every diagnosis deserves clarity.</em>
</p>
