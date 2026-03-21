# Patient Dashboard - Quick Reference

## URLs
- **Patient Dashboard:** `/dashboard/patient`
- **PDF Download API:** `/api/download-pdf/{storageId}`

## Convex Queries

### api.patient.getPatientDashboardOverview
```typescript
Input: { patientId: Id<"users"> }
Returns: {
  name: string;
  age: number;
  sex: string;
  activeDoctor: { name: string; specialty: string } | null;
  stats: { totalScans: number; completedReports: number; criticalFlags: number };
}
```

### api.patient.getPatientScans
```typescript
Input: { patientId: Id<"users"> }
Returns: Array<{
  _id: Id<"scans">;
  anatomy: string;
  modality: string;
  status: string;
  severity?: "stable" | "chronic" | "critical";
  notes?: string;
  _creationTime: number;
}>
```

### api.patient.getPatientReports
```typescript
Input: { patientId: Id<"users"> }
Returns: Array<{
  _id: Id<"reports">;
  scanId: Id<"scans">;
  summary: string;
  findings: string;
  impression: string;
  pdfStorageId?: Id<"_storage">;
  _creationTime: number;
}>
```

### api.patient.getPatientAnatomyOverlay
```typescript
Input: { patientId: Id<"users"> }
Returns: Array<{
  region: string; // e.g., "Chest", "Head"
  severity: "stable" | "chronic" | "critical";
  lastSeenAt: number;
  diagnosis?: string;
}>
```

### api.patient.getPatientConversation
```typescript
Input: { patientId: Id<"users">; conversationId: Id<"conversations"> }
Returns: Array<{
  _id: Id<"messages">;
  senderId: Id<"users">;
  senderRole: "patient" | "doctor" | "assistant";
  content: string;
  isAIAssisted?: boolean;
  _creationTime: number;
}>
```

## Convex Mutations

### api.patient.updatePatientProfile
```typescript
Input: {
  patientId: Id<"users">;
  age?: number;
  sex?: string;
  medicalHistory?: string;
}
Returns: Id<"users">
Note: Cannot edit diagnoses, scans, or reports
```

### api.patient.sendPatientMessage
```typescript
Input: {
  conversationId: Id<"conversations">;
  patientId: Id<"users">;
  content: string;
  isAIAssisted?: boolean;
}
Returns: Id<"messages">
Side effects: Creates notification for doctor
```

## Convex Actions

### api.chatAI.composePatientAIMessage
```typescript
Input: {
  patientId: Id<"users">;
  conversationId: Id<"conversations">;
  userPrompt: string;
}
Returns: string (AI-generated draft message)
Context: Last scan + last report + last 10 messages
Note: Never auto-sends, always returns draft for review
```

## Components

### PatientAnatomyView
```tsx
<PatientAnatomyView 
  anatomyData={[
    { region: "Chest", severity: "stable", lastSeenAt: 1234567890, diagnosis: "..." }
  ]} 
/>
```
**Features:** Read-only body diagram, color-coded by severity, hover tooltips

### PatientTimeline
```tsx
<PatientTimeline 
  scans={[...]} 
  reports={[...]} 
/>
```
**Features:** Tabs (Scans/Reports), timeline view, PDF download buttons

### PatientChat
```tsx
<PatientChat 
  messages={[...]} 
  conversationId="..." 
  patientId="..." 
  doctorName="Dr. Smith" 
/>
```
**Features:** Real-time chat, AI compose with approval, role-based styling

## AI Compose Workflow

1. Patient types message in input
2. Patient clicks "Get AI Help"
3. AI generates draft (using scan + report + chat history)
4. Draft appears in purple panel
5. Patient reviews and optionally edits
6. Patient clicks "Use This" or "Discard"
7. If "Use This", draft copies to input (editable)
8. Patient clicks "Send" to send message

## Severity Color Codes
- 🟢 **Stable** (#9BCF53) - No immediate concern
- 🟡 **Chronic** (#F59E0B) - Ongoing condition, managed
- 🔴 **Critical** (#EF4444) - Requires immediate attention
- ⚪ **No Data** (#E5E7EB) - No scans for this region

## Empty States
- **No Scans:** "Your medical journey will appear here."
- **No Reports:** "No signed reports yet."
- **No Messages:** "Message your doctor to begin."
- **No Anatomy Data:** Gray skeleton body diagram

## Common Issues & Solutions

### Issue: Patient dashboard shows loading spinner forever
**Solution:** Check Clerk `publicMetadata.userId` is set correctly

### Issue: Anatomy view shows all gray
**Solution:** No scans with severity data. Create test scans with `severity` field.

### Issue: PDF download button not showing
**Solution:** Report must have `pdfStorageId` (set when doctor signs report)

### Issue: AI compose button does nothing
**Solution:** Check Groq API key is set in Convex environment variables

### Issue: Chat messages not showing
**Solution:** Verify conversation exists and patient is participant

## Development Commands

```bash
# Deploy Convex functions
npx convex dev --once --typecheck=disable

# Check git status
git status

# Commit changes
git add .
git commit -m "feat: patient dashboard changes"

# Push to GitHub
git push origin main
```

## Production Checklist

- [ ] Convex deployed in production
- [ ] Groq API key set in Convex env
- [ ] Clerk authentication configured
- [ ] Test patient can view their scans
- [ ] Test patient can download PDF reports
- [ ] Test AI compose generates drafts
- [ ] Test AI compose does NOT auto-send
- [ ] Test patient cannot edit critical data
- [ ] Verify all queries use indexed fields
- [ ] Check empty states render correctly

## Key Files

- `convex/patient.ts` - Backend queries/mutations
- `convex/chatAI.ts` - AI compose action
- `app/dashboard/patient/page.tsx` - Main page
- `app/dashboard/patient/components/PatientAnatomyView.tsx` - Anatomy viewer
- `app/dashboard/patient/components/PatientTimeline.tsx` - Scans/reports timeline
- `app/dashboard/patient/components/PatientChat.tsx` - Chat interface
- `docs/PATIENT_DASHBOARD.md` - Full documentation

## Support

For issues or questions:
1. Check Convex logs for backend errors
2. Check browser console for frontend errors
3. Verify Clerk userId in publicMetadata
4. Test with different patient accounts
5. Review this documentation and PATIENT_DASHBOARD.md
