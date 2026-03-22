# VaidyaVision Project File Structure

This document outlines the complete file hierarchy of the **VaidyaVision** repository.

```
medical-ai-platform/
├── package.json                        # Project dependencies and scripts
├── tsconfig.json                       # TypeScript configuration
├── tailwind.config.ts                  # Tailwind CSS configuration
├── next.config.mjs                     # Next.js configuration
├── postcss.config.js                   # PostCSS configuration
├── middleware.ts                       # Clerk authentication middleware
├── .env.local                          # Environment variables (gitignored)
├── .env.example                        # Environment variables template
├── README.md                           # Project documentation root
├── app/                                # Next.js 14 App Router Source Code
│   ├── layout.tsx                      # Root application layout (with ClerkProvider)
│   ├── globals.css                     # Global styles
│   ├── not-found.tsx                   # Custom 404 page with Spline 3D background
│   ├── (marketing)/                    # Public-facing marketing pages
│   │   ├── layout.tsx                  # Marketing layout
│   │   ├── page.tsx                    # Landing Entry Page
│   │   └── sections/                   # Landing page sections
│   │       ├── Hero.tsx                # Hero section (Pixels to Reasoning)
│   │       ├── Features.tsx            # "What We Do" Bento Grid
│   │       ├── Architecture.tsx        # "What We Are" 7-pt Grid + Circles
│   │       ├── Datasets.tsx            # "Trained on Global Data"
│   │       └── CTA.tsx                 # Marquee Call-to-Action
│   ├── sign-in/[[...sign-in]]/         # Clerk Sign In Route
│   │   └── page.tsx                    # Custom styled sign-in page
│   ├── sign-up/[[...sign-up]]/         # Clerk Sign Up Route
│   │   └── page.tsx                    # Custom styled sign-up page
│   ├── onboarding/                     # User role selection
│   │   └── page.tsx                    # Role onboarding page (doctor/patient/student)
│   ├── dashboard/                      # Authenticated dashboard routes
│   │   ├── page.tsx                    # Dashboard router (server-side role-based redirect)
│   │   ├── doctor/
│   │   │   ├── page.tsx                # Doctor workstation
│   │   │   └── review/[scanId]/
│   │   │       └── page.tsx            # Detailed scan review
│   │   ├── patient/
│   │   │   ├── page.tsx                # Patient portal
│   │   │   └── scans/[scanId]/
│   │   │       └── page.tsx            # Patient scan result view
│   │   └── student/
│   │       └── page.tsx                # Student learning dashboard
│   ├── components/                     # App-specific logic components
│   │   ├── imaging/                    # Image viewing & analysis
│   │   │   ├── ImageViewer.tsx         # DICOM/Image viewer
│   │   │   ├── HeatmapOverlay.tsx      # Explainability overlay
│   │   │   └── SimilarCases.tsx        # UI for RAG results
│   │   ├── predictions/                # AI Result Components
│   │   │   ├── ConfidenceBar.tsx       # Confidence score visual
│   │   │   ├── DiseaseCard.tsx         # Main prediction card
│   │   │   ├── ExpertWeights.tsx       # Expert contribution visualization
│   │   │   └── UncertaintyBadge.tsx    # Uncertainty indicator
│   │   ├── dashboards/                 # Dashboard widgets
│   │   │   ├── DoctorQueue.tsx         # Patient queue list
│   │   │   └── PatientTimeline.tsx     # Medical history timeline
│   │   └── shared/                     # Reusable UI states
│   │       ├── Loader.tsx
│   │       ├── ErrorState.tsx
│   │       └── EmptyState.tsx
│   └── lib/                            # Core utilities
│       ├── clerk.ts                    # Auth configuration
│       ├── convex.ts                   # Database client
│       ├── featureFlags.ts             # Feature flagging settings
│       ├── ConvexClientProvider.tsx    # Convex + Clerk provider component
│       └── useEnsureUser.ts            # User sync hook (Clerk → Convex)
├── backend/                            # Python FastAPI Backend
│   ├── main.py                         # Application entry point
│   ├── api/
│   │   └── predict.py                  # Inference endpoints
│   ├── services/
│   │   ├── inference.py                # Model execution logic
│   │   ├── preprocessing.py            # Image normalization
│   │   ├── explainability.py           # GradCAM/LIME generation
│   │   └── retrieval.py                # Vector search logic
│   └── utils/
│       ├── dicom.py                    # DICOM file handling
│       └── validators.py               # Input validation
├── components/                         # Global Shared UI Components
│   └── marketing/
│       ├── Navbar.tsx                  # Main navigation
│       ├── Footer.tsx                  # Site footer
│       ├── FullScreenMenu.tsx          # Mobile menu overlay
│       ├── Marquee.tsx                 # Infinite scroll component
│       ├── MouseFollower.tsx           # Custom cursor
│       └── SplineBackground.tsx        # 3D interactive background
├── convex/                             # Backend-as-a-Service (Database)
│   ├── schema.ts                       # Production database schema (v3.0.0)
│   ├── ai.ts                           # AI integration functions
│   ├── doctors.ts                      # Doctor management
│   ├── users.ts                        # User management (upsertFromClerk, getByToken, setRole)
│   ├── scans.ts                        # Scan operations
│   ├── reports.ts                      # Report generation
│   └── notifications.ts                # Notification system
├── ml/                                 # Machine Learning Codebase
│   ├── backbone/                       # Feature Extractors
│   │   ├── resnet.py
│   │   ├── densenet.py
│   │   └── vit.py
│   ├── experts/                        # Specialized Models
│   │   ├── lung_expert.py
│   │   ├── brain_expert.py
│   │   ├── bone_expert.py
│   │   └── dental_expert.py
│   ├── heads/                          # Classification/Embedding Heads
│   │   ├── anatomy_head.py
│   │   ├── modality_head.py
│   │   └── embedding_head.py
│   ├── routing/                        # Multi-Expert Routing
│   │   └── gating_network.py           # Gating logic
│   ├── retrieval/                      # RAG System
│   │   ├── index_builder.py            # FAISS index construction
│   │   └── similarity_search.py        # Search implementation
│   ├── explainability/                 # XAI Techniques
│   │   ├── gradcam.py
│   │   └── lime.py
│   └── evaluation/                     # Metrics & Testing
│       ├── metrics.py
│       └── calibration.py
├── docs/                               # Project Documentation
│   ├── CONVEX_SCHEMA.md                # DB Schema documentation (v3.0.0)
│   ├── DEPLOYMENT.md                   # Deployment guide
│   ├── ML_CONTRACT.md                  # API Contract
│   ├── MODEL_ARCHITECTURE.md           # Architecture deep-dive
│   ├── VISUAL_RAG_LOGIC.md             # RAG logic explanation
│   └── file_structure.md               # This file
├── scripts/                            # Utility Scripts
│   ├── benchmark.py                    # Performance testing
│   ├── build_index.py                  # Vector index builder
│   └── download_models.py              # Model downloader
└── public/                             # Static Assets
    ├── icons/                          # SVG Icons
    └── images/                         # Static images
```
