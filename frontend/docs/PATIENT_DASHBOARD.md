# Patient Dashboard - Complete Implementation Guide

## Overview
The patient dashboard provides a **read-only, secure view** of medical scans, signed reports, anatomy visualization, and direct chat communication with doctors. All features follow the principle of **informed patient engagement** while maintaining data integrity.

## Architecture

### Backend (Convex)

#### File: `convex/patient.ts` (236 lines)
Contains all patient-specific queries and mutations:

**Queries:**
1. **getPatientDashboardOverview** - Returns patient info, active doctor, and statistics
   - Input: `patientId`
   - Returns: name, age, sex, doctor info, stats (totalScans, completedReports, criticalFlags)
   - Index used: `by_patient`

2. **getPatientScans** - Timeline of all patient scans
   - Input: `patientId`
   - Returns: Array of scans with anatomy, modality, status, severity, notes
   - Index used: `by_patient`
   - Ordered by: `_creationTime` (descending)

3. **getPatientReports** - All signed reports for patient
   - Input: `patientId`
   - Returns: Array of reports with summary, findings, impression, pdfStorageId
   - Index used: `by_patient` + filter by status "signed"
   - Ordered by: `_creationTime` (descending)

4. **getPatientAnatomyOverlay** - Anatomy map with severity colors
   - Input: `patientId`
   - Returns: Array of body regions with severity (stable/chronic/critical), diagnosis, lastSeenAt
   - Logic: Groups scans by anatomy, determines max severity per region

5. **getPatientConversation** - Chat messages with doctor
   - Input: `patientId, conversationId`
   - Returns: Array of messages (patient/doctor/assistant) with timestamps
   - Index used: `by_conversation_time`

**Mutations:**
1. **updatePatientProfile** - Limited profile editing
   - Allowed fields: `age, sex, medicalHistory`
   - **Prohibited**: Cannot edit diagnoses, reports, or scans
   - Validation: Only patient can edit their own profile

2. **sendPatientMessage** - Send message to doctor
   - Creates message in conversation
   - Creates notification for doctor
   - Auto-marks isAIAssisted if message came from AI compose

#### File: `convex/chatAI.ts` (Enhanced)
Added **composePatientAIMessage** action:
- Input: `patientId, conversationId, userPrompt`
- Context gathered:
  - Last scan summary (anatomy, modality, status)
  - Last report summary (if exists)
  - Last 10 chat messages
- Calls Groq AI with patient-specific system prompt
- Returns: **Draft message** (never auto-sends)
- Patient must review, edit, and manually approve before sending

### Frontend (Next.js)

#### Main Page: `app/dashboard/patient/page.tsx` (145 lines)

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Header (Patient Name, Age, Sex, Doctor Info)       │
├─────────────────────────────────────────────────────┤
│ Stats Cards (Total Scans | Completed Reports | ... )│
├──────────────────┬──────────────────────────────────┤
│                  │                                  │
│  Anatomy View    │    Timeline (Scans + Reports)   │
│  (Read-only)     │    (Tabs with Download PDFs)    │
│                  │                                  │
│                  │                                  │
├──────────────────┴──────────────────────────────────┤
│           Chat with Doctor (AI Compose)             │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Key Features:**
- Clerk authentication integration
- 5 concurrent queries (overview, scans, reports, anatomyOverlay, conversation)
- Loading states with spinner
- Glassmorphic design (backdrop-blur-md, rounded-3xl, border-white/40)
- Responsive grid layout (5-col + 7-col)
- Brand color: #9BCF53

#### Component 1: `PatientAnatomyView.tsx` (203 lines)

**Purpose:** Read-only visualization of body regions with severity color coding

**Features:**
- Simple SVG human body diagram (head, torso, arms, legs)
- Color coding:
  - 🟢 Green (#9BCF53) = Stable
  - 🟡 Yellow (#F59E0B) = Chronic
  - 🔴 Red (#EF4444) = Critical
  - ⚪ Gray (#E5E7EB) = No data
- Hover tooltips show: region, diagnosis, severity, last seen date
- Empty state: Gray skeleton + "Your medical journey will appear here."

**Props:**
```typescript
interface AnatomyData {
  region: string;
  severity: "stable" | "chronic" | "critical";
  lastSeenAt: number;
  diagnosis?: string;
}
```

**Implementation Notes:**
- Uses Map for O(1) severity lookups
- Fully typed with explicit return types
- No click interactions (read-only)

#### Component 2: `PatientTimeline.tsx` (310 lines)

**Purpose:** Timeline view of scans and signed reports with PDF download

**Features:**
- Tab navigation: "Scans" | "Reports"
- Scans tab:
  - Timeline view with dots and connecting lines
  - Each scan shows: anatomy, modality, status badge, severity badge
  - Timestamp in human-readable format
  - Notes field (if available)
- Reports tab:
  - Timeline view with purple dots
  - Each report shows: summary, findings, impression
  - **Download PDF button** (if pdfStorageId exists)
  - Timestamp in human-readable format
- Empty states:
  - No scans: "Your medical journey will appear here."
  - No reports: "No signed reports yet."

**Props:**
```typescript
interface Scan {
  _id: string;
  _creationTime: number;
  anatomy: string;
  modality: string;
  status: string;
  severity?: "stable" | "chronic" | "critical";
  notes?: string;
}

interface Report {
  _id: string;
  _creationTime: number;
  scanId: string;
  summary: string;
  findings: string;
  impression: string;
  pdfStorageId?: string;
}
```

**PDF Download:**
- Button only visible when `pdfStorageId` exists
- Opens in new tab: `/api/download-pdf/${storageId}`
- Icon + "Download PDF" label

#### Component 3: `PatientChat.tsx` (329 lines)

**Purpose:** Real-time chat with doctor + AI-assisted message composition

**Features:**
- Message history with role-based styling:
  - Patient: Green (#9BCF53), right-aligned
  - Doctor: Gray, left-aligned
  - AI Assistant: Purple with border
- **AI Compose Workflow:**
  1. Patient types initial message
  2. Clicks "Get AI Help" button
  3. AI generates draft (never sends automatically)
  4. Draft appears in purple panel
  5. Patient can:
     - ✅ "Use This" → Copies draft to input (editable)
     - ❌ "Discard" → Removes draft
  6. Patient manually clicks "Send" to send message
- AI-assisted messages get `isAIAssisted: true` flag
- Empty state: "Message your doctor to begin."
- Active status indicator (green pulse)

**Props:**
```typescript
interface Message {
  _id: Id<"messages">;
  _creationTime: number;
  conversationId: Id<"conversations">;
  senderId: Id<"users">;
  senderRole: "patient" | "doctor" | "assistant";
  content: string;
  isAIAssisted?: boolean;
}
```

**AI Compose Safety:**
- Loading state during AI generation
- Warning text: "Review and edit before sending. AI suggestions should be verified."
- Always requires human approval
- Patient can edit draft before sending
- Transparent "AI-assisted" badge on sent messages

## Data Flow

### Patient Dashboard Load
```
User visits /dashboard/patient
  ↓
Clerk provides userId from publicMetadata
  ↓
5 parallel queries execute:
  - getPatientDashboardOverview
  - getPatientScans
  - getPatientReports
  - getPatientAnatomyOverlay
  - getPatientConversation
  ↓
Components render with data
```

### AI Compose Flow
```
Patient types message → clicks "Get AI Help"
  ↓
composePatientAIMessage action:
  - Fetches last scan
  - Fetches last report
  - Fetches last 10 messages
  - Calls Groq AI (llama-3.1-70b)
  ↓
Draft returned to frontend
  ↓
Patient reviews + edits
  ↓
Patient clicks "Send"
  ↓
sendPatientMessage mutation:
  - Creates message with isAIAssisted=true
  - Creates notification for doctor
```

### PDF Download Flow
```
Patient clicks "Download PDF" in timeline
  ↓
Opens: /api/download-pdf/${pdfStorageId}
  ↓
Backend fetches from Convex storage
  ↓
File downloads to patient's device
```

## Security & Constraints

### Schema Integrity
- ✅ No new tables created (uses existing: users, scans, reports, conversations, messages)
- ✅ All queries use indexed fields only
- ✅ No direct database writes from frontend

### Read-Only Principle
- ✅ Patients cannot edit scans
- ✅ Patients cannot edit reports
- ✅ Patients cannot edit diagnoses
- ✅ Anatomy view has no click interactions

### AI Safety
- ✅ AI never sends messages automatically
- ✅ All AI suggestions require human review
- ✅ Clear labeling of AI-assisted messages
- ✅ Patients can edit AI drafts before sending

### Data Access
- ✅ Patients can only see their own data (queries filter by patientId)
- ✅ Conversations limited to patient-doctor pairs
- ✅ Reports only visible after signing (status filter)

## Testing Checklist

### Patient Dashboard
- [ ] Dashboard loads without errors
- [ ] Patient name, age, sex display correctly
- [ ] Active doctor name shows (if assigned)
- [ ] Stats cards show correct counts
- [ ] Loading spinner appears during data fetch
- [ ] Empty states render when no data

### Anatomy View
- [ ] Body diagram renders correctly
- [ ] Colors match severity (green/yellow/red)
- [ ] Hover tooltips show correct info
- [ ] Empty state shows when no scans
- [ ] No click interactions (read-only verified)

### Timeline
- [ ] Scans tab shows all patient scans
- [ ] Reports tab shows all signed reports
- [ ] Status badges render correctly
- [ ] Severity badges match scan data
- [ ] PDF download button only shows when pdfStorageId exists
- [ ] PDF download opens in new tab
- [ ] Empty states render correctly

### Chat
- [ ] Message history loads correctly
- [ ] Patient messages appear on right (green)
- [ ] Doctor messages appear on left (gray)
- [ ] AI Assistant messages styled with purple
- [ ] "Get AI Help" button works
- [ ] AI draft appears in purple panel
- [ ] "Use This" copies draft to input
- [ ] "Discard" removes draft
- [ ] Draft is editable before sending
- [ ] Send button only enabled when message not empty
- [ ] isAIAssisted badge shows on sent messages
- [ ] Empty state renders when no messages

## Deployment

### Prerequisites
- Convex deployed (npx convex dev)
- Clerk authentication configured
- Groq API key set in Convex environment

### Deploy Steps
1. Push code to GitHub: `git push origin main`
2. Deploy Convex: `npx convex deploy --prod`
3. Verify queries in Convex dashboard
4. Test patient dashboard in production
5. Monitor for errors in Convex logs

### Environment Variables
- `GROQ_API_KEY` - Set in Convex environment variables
- Clerk publishable key - Set in `.env.local`

## Future Enhancements

### Phase 1 (Optional)
- [ ] Profile edit modal (age, sex, medicalHistory)
- [ ] Download all reports as ZIP
- [ ] Print-friendly report view
- [ ] Share report with external doctor

### Phase 2 (Advanced)
- [ ] Real-time chat notifications
- [ ] Voice message support
- [ ] Multi-language support
- [ ] Dark mode

### Phase 3 (Research)
- [ ] 3D anatomy visualization
- [ ] AR scan overlay on phone
- [ ] Appointment scheduling
- [ ] Medication tracking

## Success Metrics

✅ **Core Objectives Met:**
1. Patient can understand their condition (anatomy view + timeline)
2. Patient can talk to their doctor (chat with AI assist)
3. Patient can see history (scans + signed reports)
4. Patient can download reports (PDF download)
5. Patient cannot edit critical data (read-only constraints)
6. AI never sends without approval (human-in-loop)

## Commit Summary

**Commit:** `e3cd927`
**Message:** "feat: Complete patient dashboard with read-only anatomy, reports timeline, and AI-assisted chat"

**Files Changed:** 7 files, 1,336 insertions, 3 deletions
- ✅ convex/patient.ts (new, 236 lines)
- ✅ convex/chatAI.ts (enhanced)
- ✅ app/dashboard/patient/page.tsx (replaced)
- ✅ app/dashboard/patient/components/PatientAnatomyView.tsx (new, 203 lines)
- ✅ app/dashboard/patient/components/PatientTimeline.tsx (new, 310 lines)
- ✅ app/dashboard/patient/components/PatientChat.tsx (new, 329 lines)
- ✅ convex/_generated/api.d.ts (auto-generated)

**Status:** ✅ Pushed to GitHub successfully
