# RAG System Contract — Engineering Specification

**Last Updated:** January 23, 2026  
**Status:** LOCKED — Do not deviate without team review  
**Owner:** Backend RAG Implementation Team  

---

## 🎯 What RAG Means in This Product

RAG in this system is **NOT a chatbot**.

It is a **clinical reasoning assistant** that answers questions grounded in:
1. The current scan
2. Historically similar scans (vector search)
3. Past outcomes / reports
4. Doctor context

**Critical Rule:** If the model cannot cite stored cases → it should say it doesn't know.

---

## 🗄️ Data Sources (Convex Tables)

RAG only reads from these tables. **No writes during inference.**

### 1️⃣ `scans`

**Used for:**
- Current scan diagnosis
- Confidence scores
- Anatomy region
- Embedding (vector)

**Key fields:**
```typescript
{
  scanId: Id<"scans">
  patientId: Id<"users">
  anatomy: "lung" | "brain" | "spine" | "eye" | "breast" | "abdomen" | "skin" | "pathology"
  anatomyRegion?: AnatomyRegion  // e.g., "left_lung_lower", "right_lung_apex"
  aiResult: {
    primaryDiagnosis: string
    confidence: number  // 0-1
    embedding?: number[]  // 512-dim vector
  }
  createdAt: number
}
```

---

### 2️⃣ `historicalCases` (VERY IMPORTANT)

This is your **RAG memory bank**.

**Used for:**
- Vector similarity search
- Case-based reasoning
- Recovery paths

**Key fields:**
```typescript
{
  caseId: string
  anatomy: AnatomyCategory
  diagnosis: string
  outcome?: string
  embedding: number[]  // 512-dim vector
  metadata?: {
    age?: number
    sex?: string
  }
}
```

👉 **This table NEVER mutates during inference.**

---

### 3️⃣ `reports`

**Used for:**
- Human-verified truth
- Grounding language
- Generating better drafts

**Key fields:**
```typescript
{
  scanId: Id<"scans">
  authorId: Id<"users">
  findings: string
  impression: string
  isAiCorrected: boolean
  signedAt: number
}
```

---

### 4️⃣ `users` (Patient context)

**Used for:**
- Contextual bias (age, sex)
- **NOT for diagnosis**

---

## 🔌 RAG Endpoints (Convex Functions)

Implement exactly these in `convex/rag.ts`.

---

### 1️⃣ `rag:getSimilarCases`

**Purpose:** Find clinically similar past cases using embeddings.

**Input:**
```typescript
{
  scanId: Id<"scans">
  topK?: number  // default 5
}
```

**Logic:**
1. Fetch `scan.aiResult.embedding`
2. Vector search on `historicalCases.embedding`
3. Filter by:
   - Same `anatomy`
   - Same `anatomyRegion` (if available)
4. Return top K by similarity score

**Output:**
```typescript
{
  caseId: string
  diagnosis: string
  outcome?: string
  similarity: number  // 0-1
}[]
```

---

### 2️⃣ `rag:buildContextBundle` (MOST IMPORTANT)

**Purpose:** Create the grounded context sent to the LLM.

**Input:**
```typescript
{
  scanId: Id<"scans">
}
```

**Output (STRICT SHAPE):**
```typescript
{
  currentScan: {
    anatomy: string
    region?: string
    diagnosis: string
    confidence: number
  }

  patientContext: {
    age?: number
    sex?: string
    pastConditions: string[]
  }

  similarCases: {
    diagnosis: string
    outcome?: string
    similarity: number
  }[]

  priorReports: {
    findings: string
    impression: string
  }[]
}
```

⚠️ **NO free text here. Only structured facts.**

---

### 3️⃣ `rag:askQuestion`

**Purpose:** Answer doctor or patient questions using RAG.

**Input:**
```typescript
{
  scanId: Id<"scans">
  question: string
}
```

**Internal Steps:**
1. Call `buildContextBundle`
2. Construct system prompt:
   - "You are a medical assistant…"
   - "Use only the provided cases…"
3. Send to LLM (Groq)
4. Parse answer
5. Attach citations

**Output:**
```typescript
{
  answer: string
  citedCaseIds: string[]
  confidence: "high" | "medium" | "low"
}
```

---

### 4️⃣ `rag:generateReportDraft`

**Purpose:** Generate first-pass clinical report.

**Input:**
```typescript
{
  scanId: Id<"scans">
}
```

**Output:**
```typescript
{
  findings: string
  impression: string
  recommendations: string
}
```

⚠️ **This does NOT auto-save. Doctor must explicitly click "Save Draft".**

---

## 🧠 Prompting Rules (VERY IMPORTANT)

### ✅ Allowed
- Compare cases
- Mention similarity %
- Say "Based on similar cases…"
- Reference specific case IDs
- Acknowledge uncertainty

### ❌ Forbidden
- Invent statistics
- Use internet knowledge
- Diagnose beyond evidence
- Say "studies show…"
- Provide treatment advice
- Make definitive clinical recommendations

---

### Example System Prompt

```
You are a medical reasoning assistant.

You MUST only use the provided scan data,
historical cases, and prior reports.

If insufficient evidence exists,
respond with "Insufficient data to answer this question based on available cases."

Do not provide treatment advice.
Do not diagnose conditions not present in similar cases.
Always cite case IDs when referencing similar cases.
```

---

## 🖥️ Frontend Integration

### Scan Review Page (`/dashboard/doctor/scan/[scanId]`)
- **On load** → Call `getSimilarCases`
- **On "Ask AI"** → Call `askQuestion`
- **On "Generate Draft"** → Call `generateReportDraft`

### Patient Explorer (`/dashboard/doctor/patients`)
- Uses `getSimilarCases` for anatomy heatmap intensity
- **Does NOT use chat**

### UI Components
- `AiRagPanel.tsx` — Displays similar cases + chat interface
- `SimilarCases.tsx` — Renders similar case cards
- `ReportActions.tsx` — Triggers report generation

---

## 📦 Storage & Caching

- **Similar cases** → Cached per scan (query result cached by Convex)
- **Report drafts** → Stored only after doctor confirmation
- **Chat history** → Stored in `messages` table linked to `conversations`
- **No RAG output is trusted until human signs**

---

## 🚨 Failure Behavior (Must Implement)

### If:
- No embeddings exist for current scan
- No similar cases found
- Confidence < threshold (0.3)
- Vector search fails

### Then:
```typescript
{
  answer: "No comparable cases found in system memory. Manual review recommended.",
  citedCaseIds: [],
  confidence: "low"
}
```

**This builds trust.**

---

## 🧩 Division of Work

### Frontend Team (Already Implemented)
- ✅ Scan UI components
- ✅ Skeleton visualization
- ✅ Timeline display
- ✅ Report signing workflow
- ✅ Convex schema
- ✅ Settings page

### RAG Team (To Implement)
- ⏳ `convex/rag.ts` (all 4 endpoints)
- ⏳ Vector search logic
- ⏳ LLM integration (Groq)
- ⏳ Prompt engineering
- ⏳ Citation tracking
- ⏳ Error handling

---

## 🔐 Security & Privacy

1. **Patient Data:** Never send raw patient identifiers to external LLM
2. **Embeddings:** Use anonymized case data only
3. **Logging:** Do NOT log patient names in RAG queries
4. **Rate Limiting:** Implement per-doctor rate limits on `askQuestion`

---

## ✅ Acceptance Criteria

Before considering RAG "done":

- [ ] All 4 endpoints implemented
- [ ] Vector search returns relevant cases
- [ ] LLM responses cite case IDs
- [ ] "Insufficient data" response works
- [ ] Report drafts follow FINDINGS/IMPRESSION/RECOMMENDATIONS format
- [ ] No hallucinations in 10 test queries
- [ ] Frontend displays similar cases correctly
- [ ] Error states render gracefully

---

## 📞 Communication Protocol

**Questions about:**
- Schema changes → Ask frontend team FIRST
- Embedding dimensions → Locked at 512
- New anatomy regions → Update `app/types/anatomy.ts` first
- LLM provider changes → Document in this file

**Don't:**
- Add new tables without schema review
- Change existing query shapes
- Modify `historicalCases` structure
- Deploy without testing against seed data

---

## 🧪 Testing Against Seed Data

Use the seed data created by `convex/seedDemoData.ts`:

**Test Cases:**
1. Query Rahul Mehta's chronic lung scans → Should find similar COPD cases
2. Query Imran Khan's critical pneumothorax → Should prioritize critical cases
3. Ask "What is the prognosis?" → Should cite similar case outcomes
4. Ask about non-existent condition → Should return "insufficient data"

**Run:**
```bash
npx convex run rag:getSimilarCases '{"scanId": "<scan-id>"}'
npx convex run rag:askQuestion '{"scanId": "<scan-id>", "question": "What is the likely outcome?"}'
```

---

## 📚 Additional Documentation

- [Convex Schema](./CONVEX_SCHEMA.md)
- [Model Architecture](./MODEL_ARCHITECTURE.md)
- [Visual RAG Logic](./VISUAL_RAG_LOGIC.md)
- [Anatomy Types](../app/types/anatomy.ts)

---

## 🚀 Quick Start for RAG Team

```bash
# 1. Clone and setup
git clone <repo>
cd medical-ai-platform
npm install
npx convex dev

# 2. Seed demo data
npx convex run seedDemoData:seedDemoData

# 3. Create convex/rag.ts
# Implement the 4 endpoints following this spec

# 4. Test locally
npx convex run rag:getSimilarCases '{"scanId": "..."}'

# 5. Integrate with frontend (already wired)
npm run dev
# Visit http://localhost:3000/dashboard/doctor
```

---

## ⚠️ Final Warning

**DO NOT:**
- Turn this into a general-purpose chatbot
- Add web search capabilities
- Allow free-form diagnosis generation
- Skip citation tracking
- Ignore confidence thresholds

**This is medical software. Precision > Creativity.**

---

**Questions?** Tag @frontend-team in #engineering before making changes.
