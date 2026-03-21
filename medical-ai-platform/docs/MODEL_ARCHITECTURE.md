# VaidyaVision – System & Model Architecture

VaidyaVision is a medical AI diagnostics platform built to analyze medical images, route them to specialized expert models, and return **explainable, case-backed predictions** for doctors and patients.

The system is intentionally designed to decouple:
- product UX,
- real-time backend state,
- and machine learning inference.

---

## 1. High-Level System Overview

VaidyaVision is composed of four major layers:

1. **Frontend (Product Layer)**  
   User-facing dashboards for patients and doctors.

2. **Backend Orchestration Layer**  
   Coordinates inference requests and ML workflows.

3. **Real-time Data Layer**  
   Stores scans, predictions, reports, and events.

4. **ML Core (Mixture of Experts)**  
   Performs anatomy-aware, modality-aware diagnosis with explainability.

---

## 2. Technology Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Authentication:** Clerk
- **Styling:** Tailwind CSS
- **Visualization:** Custom React components (future: DICOM viewers)

### Backend & Data
- **Database & Realtime Engine:** Convex
- **File Storage:** Convex Storage
- **Backend Orchestration:** FastAPI (Python)

### Machine Learning
- **Framework:** PyTorch
- **Architecture:** Mixture of Experts (MoE)
- **Backbones:** ResNet, DenseNet, Vision Transformer (ViT)
- **Explainability:** Grad-CAM, LIME
- **Retrieval (RAG):** FAISS / Milvus

---

## 3. System-Level Architecture (Product + ML)

```mermaid
flowchart TD
    Client["Next.js 14 Frontend"] -->|Auth Clerk| Gateway["Backend Gateway"]
    Gateway -->|"Realtime Queries"| DB[("Convex Database")]
    Gateway -->|"Inference Request"| API["FastAPI Orchestrator"]

    subgraph "ML Inference Engine"
        API --> Pre["Preprocessing & Normalization"]
        Pre --> Router{Routing/Gating Network}

        Router -->|"Lung X-Ray"| Lung["Lung Expert"]
        Router -->|"Brain MRI"| Brain["Brain Expert"]
        Router -->|"Dental X-Ray"| Dental["Dental Expert"]
        Router -->|"Bone X-Ray"| Bone["Bone Expert"]

        Lung & Brain & Dental & Bone --> Fusion["Expert Output Fusion"]

        Fusion --> XAI["Explainability Module"]
        XAI --> Heatmap["Grad-CAM Heatmaps"]

        Pre --> Embed["Embedding Head"]
        Embed --> VectorDB[("Vector DB")]
        VectorDB --> Similar["Similar Case Retrieval"]
    end

    API -->|"Prediction JSON"| DB
    DB -->|"Reactive Updates"| Client
```

---

## 4. Detailed Model Inference Pipeline

The following flow illustrates the granular processing of an input image through the backbone, routing network, and retrieval components:

```mermaid
flowchart TD
    Input["INPUT IMAGE"] --> Pre["Preprocessing (resize, normalize, aug)"]
    Pre --> Backbone["Shared Visual Backbone (ResNet / DenseNet / ViT)"]

    Backbone --> EmbedHead["Embedding Head (Proj + Norm)"]
    Backbone --> AnatomyHead["Anatomy Head (Classifier)"]
    Backbone --> ModalityHead["Modality Head (Classifier)"]
    Backbone --> FeatureMaps["Feature Maps (for Grad-CAM)"]

    EmbedHead --> EmbedSpace["Embedding Space (vector z)"]
    AnatomyHead --> AnatomyProb["Anatomy Prob (softmax)"]
    ModalityHead --> ModalityProb["Modality Prob (softmax)"]

    EmbedSpace --> RetrievalEngine{Retrieval Engine}
    AnatomyProb --> Router{Routing / Gating Network}
    ModalityProb --> Router

    RetrievalEngine --> TopK["Top-K Similar Cases (embeddings)"]
    RetrievalEngine --> Metadata["Case Metadata (labels, anatomy)"]

    TopK & Metadata --> Context["Retrieval Context (confidence priors)"]
    Context --> Router

    Router --> Lung["Lung Expert (CNN)"]
    Router --> Bone["Bone Expert (CNN)"]
    Router --> Dental["Dental Expert (CNN)"]
    Router --> Others[...]

    Lung & Bone & Dental & Others --> Fusion["Expert Output Fusion (weighted/uncertainty)"]

    Fusion --> Final["Final Prediction + Scores"]

    Final --> GradCAM["Grad-CAM Head (heatmaps)"]
    Final --> Explain["Explanation Module (retrieval + text)"]

    FeatureMaps --> GradCAM
```