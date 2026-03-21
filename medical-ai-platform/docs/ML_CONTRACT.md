# Machine Learning Interface Contract

**Version:** 1.2.0 (Definitive Model Scope & Taxonomy)
**Status:** Live

This document defines the strict API contract between the **Product Backend (Next.js/Convex)** and the **ML Inference Service (FastAPI)**.

---

## 1. API Endpoint Definition

**POST** `/predict`

* **Content-Type:** `multipart/form-data`
* **Timeout:** 30 seconds (Standard), 120 seconds (3D Volumes)

### **Request Structure (The "JSON-as-String" Pattern)**

To handle complex nested metadata alongside a binary image, we use a single form field named `metadata` that contains a stringified JSON object.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `image` | **Binary File** | The raw image file (`.dcm`, `.jpg`, `.png`). Max 50MB. |
| `metadata` | **String** | A JSON-serialized string matching the schema below. |

> [!IMPORTANT]  
> If both the uploaded image (e.g., DICOM tags) and the `metadata` provide anatomy or modality information, the **metadata value takes precedence**.

### **Metadata Schema (JSON)**

The `metadata` string must parse into this structure:

```json
{
  "anatomy": "lung",          // Required: "lung" | "brain" | "bone" | "skin" | "eye" | "breast" | "microscopy" | "abdomen"
  "modality": "xray",         // Required: "xray" | "mri" | "ct" | "dermoscopy" | "clinical" | "fundus" | "pathology"
  "age": 45,                  // Optional: Integer
  "sex": "M",                 // Optional: "M" | "F"
  "view": "PA",               // Optional: "PA" | "AP" | "Lateral"
  "dataset_id": "hospital_A"  // Optional: Internal tracking ID
}
```

---

## 2. Response Schema (JSON)

**Success (200 OK)**

```json
{
  "disease_label": "Pneumonia",
  "confidence": 0.985,
  "heatmap_base64": "data:image/png;base64,iVBORw0KGgoAAA...", // Optional
  "similar_cases": ["case_8821", "case_1029"],                  // IDs for retrieval
  "routing_info": {
     "expert_used": "LungExpert_v2",
     "compute_time_ms": 450
  }
}
```

**Error (4xx / 5xx)**

```json
{
  "error_code": "INVALID_METADATA",
  "detail": "Field 'age' must be an integer."
}
```

---

## 3. Implementation Reference

### **Frontend (Next.js)**

*Do not set `Content-Type` manually; let the browser handle the boundary.*

```typescript
const formData = new FormData();
formData.append("image", fileInput.files[0]);
formData.append("metadata", JSON.stringify({
  anatomy: "lung",
  modality: "xray",
  age: 62
}));

await fetch("/predict", { method: "POST", body: formData });
```

### **Backend (FastAPI)**

*Parse the string manually using Pydantic.*

```python
class MLMetadata(BaseModel):
    anatomy: Optional[str]
    modality: Optional[str]
    age: Optional[int]

@app.post("/predict")
async def predict(
    image: UploadFile = File(...),
    metadata: str = Form(...)
):
    try:
        # 1. Deserialize
        meta_dict = json.loads(metadata)
        # 2. Validate
        meta = MLMetadata(**meta_dict)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    
    # ... Run Inference ...

---

## 4. Appendix: Model Taxonomy & Definitive Label Sets

This section defines the definitive scope of models supported by the VaidyaVision inference engine.

### A. Lung (Chest X-ray)
- **Type:** Multi-label classification
- **Modality:** `xray`
- **Labels:** `Atelectasis`, `Cardiomegaly`, `Effusion`, `Infiltration`, `Mass`, `Nodule`, `Pneumonia`, `Pneumothorax`, `Consolidation`, `Edema`, `Emphysema`, `Fibrosis`, `Pleural Thickening`, `Hernia`
- **Note:** High explainability requirement due to overlapping conditions.

### B. Bone (Fracture/Pathology)
- **Type:** Binary classification
- **Modality:** `xray`, `mri`
- **Labels:** `Normal`, `Abnormal`
- **Routing:** Bone Expert

### C. Skin (Dermatology)
- **Type:** Multi-class classification (HAM10000)
- **Modality:** `dermoscopy`, `clinical`
- **Labels:** `AKIEC`, `BCC`, `BKL`, `DF`, `MEL`, `NV`, `VASC`
- **Note:** High-risk domain (Melanoma).

### D. Eye (Retinal Fundus)
- **Type:** Ordinal multi-class
- **Modality:** `fundus`
- **Labels:** `No DR`, `Mild DR`, `Moderate DR`, `Severe DR`, `Proliferative DR`
- **Note:** Severity ordering is clinically significant.

### E. Brain (MRI)
- **Type:** Binary classification
- **Modality:** `mri`
- **Labels:** `Normal`, `Tumor`
- **Extension:** Future support for sub-types and segmentation.

### F. Breast (Oncology)
- **Type:** Binary classification
- **Modality:** `xray` (Mammography), `mri`
- **Labels:** `Benign`, `Malignant`

### G. Microscopy / Pathology
- **Type:** Object classification / counting
- **Modality:** `pathology`
- **Labels:** `Red blood cells`, `White blood cells`, `Platelets`, `Parasites`
- **Note:** Uses specialized inference for individual cell detection.

### H. Abdomen (CT Grading)
- **Type:** Ordinal regression
- **Modality:** `ct`
- **Labels:** `Class 0` through `Class 7`
- **Note:** Maps to a continuous severity scale.
```