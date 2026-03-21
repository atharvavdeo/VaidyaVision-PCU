# VaidyaVision: Master System Architecture & Data Specification

**Project:** VaidyaVision
**Version:** 3.1.0 (Architecture, Schema & Strategy)
**Scope:** System Logic, Visual RAG Workflow, and Data Structures
**Status:** Locked for Development

---

## 1. Executive Summary

VaidyaVision is a multimodal medical diagnostic platform that differentiates itself through **explainability**. Unlike standard AI that simply outputs a probability label (e.g., "Pneumonia: 94%"), VaidyaVision grounds its diagnosis in two pillars of evidence:
1.  **Visual Evidence:** Heatmaps identifying exactly *where* the AI is looking.
2.  **Historical Precedent (Visual RAG):** Retrieving and displaying similar confirmed past cases from a hospital database to validate the current diagnosis.

This document outlines the logical architecture, the "Visual RAG" mechanism, and the database schema required to support these features.

---

## 2. High-Level System Architecture

The system follows a **"Split-Brain" Architecture**, separating the user-facing product from the heavy computational intelligence.

### A. The Product Layer (User & Data)
* **Role:** Handles user authentication, dashboard rendering, real-time chat, and persistent storage.
* **Technology:** Next.js (Frontend) + Convex (Real-time Database).
* **Responsibility:** Ensures the doctor has a fast, reactive interface that never "freezes" while waiting for AI analysis.

### B. The Intelligence Layer (Compute & Logic)
* **Role:** Stateless engine performing image analysis, vector math, and reasoning.
* **Technology:** Python Microservice + Vector Database.
* **Responsibility:**
    1.  **Orchestration:** Receiving images and routing them to the correct model (Lung vs. Brain).
    2.  **Embedding:** Converting images into mathematical vectors.
    3.  **Retrieval:** Searching the database for similar patient histories.
    4.  **Reasoning:** Generating natural language reports via LLM.

---

## 3. The Visual RAG Logic (Step-by-Step)

The core innovation is the **Retrieval-Augmented Generation (RAG)** pipeline, which operates in four distinct phases:

[Image of retrieval augmented generation workflow diagram]

### Phase 1: Translation (The "Digital Fingerprint")
The system does not just "look" at an image; it translates it into math.
* **Process:** The patient's X-ray is passed through a Deep Neural Network (e.g., ResNet50).
* **Extraction:** Instead of getting a diagnosis immediately, we extract the data from the internal layers of the network.
* **Output:** A list of 2,048 numbers (a "Vector"). This unique combination of numbers represents the texture, shape, and patterns of the patient's pathology.

### Phase 2: Storage (The "Memory Bank")
* **Logic:** Every historical patient case verified by doctors is stored as a vector in a high-speed Vector Database.
* **Clustering:** In this mathematical space, similar diseases naturally group together. All "Viral Pneumonia" vectors sit in one cluster; all "Healthy Lung" vectors sit in another.

### Phase 3: Retrieval (The "Search")
* **Query:** When a *new* patient scan arrives, it is converted into a vector.
* **Search:** The system measures the geometric distance between the new patient and every past patient.
* **Result:** It identifies the "Top 3 Nearest Neighbors"—the three past cases that are mathematically most identical to the current patient.

### Phase 4: Consultation (The "Reasoning")
* **Synthesis:** The system creates a dossier containing:
    1.  The current patient's visual analysis (Heatmap).
    2.  The full medical records of the 3 retrieved past cases.
* **Generation:** An AI Logic Engine (LLM) reviews this dossier. It argues: *"Since the current scan matches Visual Patterns A and B found in confirmed Tuberculosis cases #102 and #881, the likely diagnosis is Tuberculosis."*

---

## 4. System Architecture Diagram

```mermaid
flowchart TD
    %% USER LAYER
    User["Doctor / User"] -->|Uploads X-Ray| Frontend["Product Dashboard"]
    Frontend -->|Syncs Data| DB["Real-time Database"]

    %% INTELLIGENCE LAYER
    DB -->|Trigger Analysis| Engine["AI Orchestrator"]
    
    subgraph "Visual Intelligence Core"
        Engine -->|1. Process| Backbone["Visual Model (CNN)"]
        Backbone -->|Output A| Heatmap["Attention Heatmap"]
        Backbone -->|Output B| Vector["Feature Vector"]
        
        Vector -->|2. Search| VectorDB[("Vector Memory")]
        VectorDB -->|3. Retrieve| Precedent["Similar Past Cases"]
    end

    %% REASONING LAYER
    subgraph "Reasoning Agent"
        Heatmap --> Prompt
        Precedent --> Prompt
        Engine -->|User Question| Prompt
        
        Prompt --> LLM["LLM (GPT-4)"]
    end

    LLM -->|4. Final Report| DB
    DB -->|Push Update| Frontend
