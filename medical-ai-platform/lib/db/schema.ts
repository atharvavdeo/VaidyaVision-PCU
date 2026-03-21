import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { eq, relations, sql } from "drizzle-orm";

// =====================================================
// 1. USERS (Clerk-backed Identity)
// =====================================================
export const users = sqliteTable("users", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    clerkId: text("clerk_id").unique().notNull(),
    role: text("role", { enum: ["patient", "doctor", "admin", "pathologist", "hospital_admin"] }).notNull(),
    name: text("name").notNull(),
    email: text("email").unique().notNull(),
    imageUrl: text("image_url"),
    specialty: text("specialty"), // doctor only — legacy, see specialties table
    hospitalId: integer("hospital_id"), // nullable bridge — PR1
    age: integer("age"),
    gender: text("gender"),
    bloodType: text("blood_type"),
    medicalHistory: text("medical_history"),
    phone: text("phone"),
    isOnboarded: integer("is_onboarded", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// =====================================================
// 2. DOCTOR PROFILES (Extended Doctor Info)
// =====================================================
export const doctorProfiles = sqliteTable("doctor_profiles", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").references(() => users.id).notNull().unique(),
    specialty: text("specialty").notNull().default("General Medicine"), // legacy — see specialties table
    specialtyId: integer("specialty_id"), // nullable bridge — PR1
    degree: text("degree").notNull().default("MBBS"),
    experience: integer("experience").default(0),
    licenseNumber: text("license_number"),
    rating: real("rating").default(5.0),
    totalConsultations: integer("total_consultations").default(0),
    totalScansReviewed: integer("total_scans_reviewed").default(0),
});

// =====================================================
// 3. SCANS (Diagnostic Events)
// =====================================================
export const scans = sqliteTable("scans", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    patientId: integer("patient_id").references(() => users.id).notNull(),
    doctorId: integer("doctor_id").references(() => users.id),
    imageUrl: text("image_url").notNull(),
    modality: text("modality", { enum: ["brain", "lung", "skin", "ecg"] }).notNull(),
    status: text("status", { enum: ["pending", "processing", "completed", "rejected"] }).notNull().default("pending"),
    priority: text("priority", { enum: ["low", "medium", "high", "critical"] }).notNull().default("medium"),
    symptoms: text("symptoms"),
    triageScore: integer("triage_score"),
    aiDiagnosis: text("ai_diagnosis"),
    aiConfidence: real("ai_confidence"),
    aiUncertainty: real("ai_uncertainty"),
    heatmapUrl: text("heatmap_url"),
    expertUsed: text("expert_used"),
    doctorNotes: text("doctor_notes"),
    originalFilename: text("original_filename"),
    uploadedAt: integer("uploaded_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    reviewedAt: integer("reviewed_at", { mode: "timestamp" }),
    // PR4 bridge columns
    hospitalId: integer("hospital_id"),
    caseId: integer("case_id"),
    sourceArtifactId: integer("source_artifact_id"),
});

// =====================================================
// 3. REPORTS (Clinical Reports)
// =====================================================
export const reports = sqliteTable("reports", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    scanId: integer("scan_id").references(() => scans.id).notNull(),
    patientId: integer("patient_id").references(() => users.id).notNull(),
    doctorId: integer("doctor_id").references(() => users.id).notNull(),
    diagnosis: text("diagnosis").notNull(),
    findings: text("findings").notNull(),
    recommendations: text("recommendations"),
    severity: text("severity", { enum: ["low", "moderate", "high", "critical"] }).notNull().default("moderate"),
    status: text("status", { enum: ["draft", "signed"] }).notNull().default("draft"),
    language: text("language").notNull().default("en"),
    templateId: integer("template_id").references(() => templates.id),
    hospitalTemplateId: integer("hospital_template_id").references(() => hospitalReportTemplates.id),
    signedAt: integer("signed_at", { mode: "timestamp" }),
    releasedAt: integer("released_at", { mode: "timestamp" }),
    pdfUrl: text("pdf_url"),
    deliveryStatus: text("delivery_status", { enum: ["pending", "sent", "failed"] }).notNull().default("pending"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    // PR4 bridge column
    caseId: integer("case_id"),
});

// =====================================================
// 4. CONVERSATIONS (Patient-Doctor Chat)
// =====================================================
export const conversations = sqliteTable("conversations", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    patientId: integer("patient_id").references(() => users.id).notNull(),
    doctorId: integer("doctor_id").references(() => users.id).notNull(),
    lastMessageAt: integer("last_message_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    // PR4 bridge column
    hospitalId: integer("hospital_id"),
});

// =====================================================
// 5. MESSAGES
// =====================================================
export const messages = sqliteTable("messages", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
    senderId: integer("sender_id").references(() => users.id).notNull(),
    content: text("content").notNull(),
    type: text("type", { enum: ["text", "scan", "report"] }).notNull().default("text"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// =====================================================
// 6. APPOINTMENTS
// =====================================================
export const appointments = sqliteTable("appointments", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    patientId: integer("patient_id").references(() => users.id).notNull(),
    doctorId: integer("doctor_id").references(() => users.id).notNull(),
    scheduledAt: integer("scheduled_at", { mode: "timestamp" }).notNull(),
    type: text("type", { enum: ["initial", "follow_up", "emergency", "review"] }).notNull().default("follow_up"),
    notes: text("notes"),
    status: text("status", { enum: ["scheduled", "confirmed", "completed", "cancelled"] }).notNull().default("scheduled"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    // PR4 bridge column
    hospitalId: integer("hospital_id"),
});

// =====================================================
// 7. TEMPLATES (Report Templates)
// =====================================================
export const templates = sqliteTable("templates", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    structureJson: text("structure_json").notNull(), // JSON: {findings, impression, recommendations}
    language: text("language").notNull().default("en"),
});

// =====================================================
// 8. NOTIFICATIONS
// =====================================================
export const notifications = sqliteTable("notifications", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").references(() => users.id).notNull(),
    type: text("type", { enum: ["scan_ready", "report_signed", "urgent_alert", "message_received", "appointment", "appointment_scheduled", "scan_completed", "case_assigned"] }).notNull(),
    message: text("message").notNull(),
    link: text("link"),
    isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// =====================================================
// 9. FAMILY MEMBERS
// =====================================================
export const familyMembers = sqliteTable("family_members", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    patientId: integer("patient_id").references(() => users.id).notNull(),
    relation: text("relation").notNull(), // spouse, child, parent
    name: text("name").notNull(),
});

// =====================================================
// RELATIONS
// =====================================================
export const doctorProfilesRelations = relations(doctorProfiles, ({ one }) => ({
    user: one(users, { fields: [doctorProfiles.userId], references: [users.id] }),
}));

// =====================================================
// 4. FOLLOW-UPS (Automation)
// =====================================================
export const followUps = sqliteTable("follow_ups", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    scanId: integer("scan_id").references(() => scans.id),
    patientId: integer("patient_id").references(() => users.id),
    scheduledFor: integer("scheduled_for").notNull(), // Unix timestamp
    type: text("type", { enum: ["email", "call"] }).notNull(),
    status: text("status", { enum: ["pending", "sent", "failed", "cancelled"] }).default("pending"),
    createdAt: integer("created_at").default(sql`(unixepoch())`),
});

// =====================================================
// 5. VOICE NOTES (Web Speech API)
// =====================================================
export const voiceNotes = sqliteTable("voice_notes", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    scanId: integer("scan_id").references(() => scans.id),
    transcription: text("transcription").notNull(),
    audioUrl: text("audio_url"), // Optional: if we save the blob later
    createdAt: integer("created_at").default(sql`(unixepoch())`),
});

// =====================================================
// EMAIL CONNECTIONS (Gmail OAuth for doctor mailbox sending)
// =====================================================
export const emailConnections = sqliteTable("email_connections", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").references(() => users.id).notNull(),
    provider: text("provider", { enum: ["gmail", "outlook"] }).notNull().default("gmail"),
    providerEmail: text("provider_email").notNull(),
    accessTokenEncrypted: text("access_token_encrypted").notNull(),
    refreshTokenEncrypted: text("refresh_token_encrypted").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    scope: text("scope"),
    status: text("status", { enum: ["active", "expired", "revoked"] }).notNull().default("active"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    uniqueUserProvider: uniqueIndex("ec_user_provider").on(table.userId, table.provider),
}));

export const emailConnectionsRelations = relations(emailConnections, ({ one }) => ({
    user: one(users, { fields: [emailConnections.userId], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
    doctorProfile: one(doctorProfiles),
    scansAsPatient: many(scans, { relationName: "patientScans" }),
    scansAsDoctor: many(scans, { relationName: "doctorScans" }),
    notifications: many(notifications),
    followUps: many(followUps),
    emailConnections: many(emailConnections),
}));

export const scansRelations = relations(scans, ({ one, many }) => ({
    patient: one(users, { fields: [scans.patientId], references: [users.id], relationName: "patientScans" }),
    doctor: one(users, { fields: [scans.doctorId], references: [users.id], relationName: "doctorScans" }),
    reports: many(reports),
    messages: many(messages),
    followUps: many(followUps),
    voiceNotes: many(voiceNotes),
}));

export const followUpsRelations = relations(followUps, ({ one }) => ({
    scan: one(scans, { fields: [followUps.scanId], references: [scans.id] }),
    patient: one(users, { fields: [followUps.patientId], references: [users.id] }),
}));

export const voiceNotesRelations = relations(voiceNotes, ({ one }) => ({
    scan: one(scans, { fields: [voiceNotes.scanId], references: [scans.id] }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
    scan: one(scans, { fields: [reports.scanId], references: [scans.id] }),
    patient: one(users, { fields: [reports.patientId], references: [users.id] }),
    doctor: one(users, { fields: [reports.doctorId], references: [users.id] }),
    template: one(templates, { fields: [reports.templateId], references: [templates.id] }),
    hospitalTemplate: one(hospitalReportTemplates, { fields: [reports.hospitalTemplateId], references: [hospitalReportTemplates.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
    patient: one(users, { fields: [appointments.patientId], references: [users.id] }),
    doctor: one(users, { fields: [appointments.doctorId], references: [users.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
    patient: one(users, { fields: [conversations.patientId], references: [users.id] }),
    doctor: one(users, { fields: [conversations.doctorId], references: [users.id] }),
    messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
    conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
    sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));

// =====================================================
// PRESCRIPTIONS (OCR-extracted documents)
// =====================================================
export const prescriptions = sqliteTable("prescriptions", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    patientId: integer("patient_id").notNull().references(() => users.id),
    imageUrl: text("image_url").notNull(),
    documentType: text("document_type").notNull().default("prescription"), // prescription, lab_report, discharge_summary, medical_document
    ocrConfidence: real("ocr_confidence"),
    ocrMethod: text("ocr_method"),
    rawText: text("raw_text"),
    cleanedText: text("cleaned_text"),
    structuredData: text("structured_data"), // JSON string of structured output
    prescribingDoctor: text("prescribing_doctor"),
    prescriptionDate: text("prescription_date"),
    uploadedAt: text("uploaded_at").notNull().default(sql`(datetime('now'))`),
    // PR4 bridge columns
    hospitalId: integer("hospital_id"),
    caseId: integer("case_id"),
    sourceArtifactId: integer("source_artifact_id"),
});

export const prescriptionsRelations = relations(prescriptions, ({ one, many }) => ({
    patient: one(users, { fields: [prescriptions.patientId], references: [users.id] }),
    medications: many(medications),
}));

// =====================================================
// MEDICATIONS (Individual drugs from prescriptions or doctor-added)
// =====================================================
export const medications = sqliteTable("medications", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    patientId: integer("patient_id").notNull().references(() => users.id),
    prescriptionId: integer("prescription_id").references(() => prescriptions.id),
    doctorId: integer("doctor_id").references(() => users.id),
    drugName: text("drug_name").notNull(),
    dosage: text("dosage"),
    form: text("form"), // tablet, capsule, syrup, injection, cream
    frequency: text("frequency"), // "twice daily", "once daily", "thrice daily"
    timeOfDay: text("time_of_day"), // JSON: ["morning","evening"]
    duration: text("duration"),
    startDate: text("start_date"),
    endDate: text("end_date"),
    instructions: text("instructions"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    addedBy: text("added_by", { enum: ["ocr", "doctor", "patient"] }).notNull().default("ocr"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const medicationsRelations = relations(medications, ({ one, many }) => ({
    patient: one(users, { fields: [medications.patientId], references: [users.id] }),
    prescription: one(prescriptions, { fields: [medications.prescriptionId], references: [prescriptions.id] }),
    logs: many(medicationLogs),
}));

// =====================================================
// MEDICATION LOGS (Track taken/missed)
// =====================================================
export const medicationLogs = sqliteTable("medication_logs", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    medicationId: integer("medication_id").notNull().references(() => medications.id),
    patientId: integer("patient_id").notNull().references(() => users.id),
    status: text("status", { enum: ["taken", "missed", "skipped"] }).notNull(),
    scheduledTime: text("scheduled_time"), // "morning", "afternoon", "evening", "night"
    takenAt: integer("taken_at", { mode: "timestamp" }),
    notes: text("notes"),
    logDate: text("log_date").notNull(), // "2025-01-15" — the date this log is for
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const medicationLogsRelations = relations(medicationLogs, ({ one }) => ({
    medication: one(medications, { fields: [medicationLogs.medicationId], references: [medications.id] }),
    patient: one(users, { fields: [medicationLogs.patientId], references: [users.id] }),
}));

// =====================================================
// EXERCISE ROUTINES (Doctor-prescribed or patient-added)
// =====================================================
export const exerciseRoutines = sqliteTable("exercise_routines", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    patientId: integer("patient_id").notNull().references(() => users.id),
    doctorId: integer("doctor_id").references(() => users.id),
    name: text("name").notNull(),
    type: text("type", { enum: ["cardio", "strength", "flexibility", "physio", "yoga", "walking", "other"] }).notNull().default("other"),
    description: text("description"),
    frequency: text("frequency"), // "daily", "3x/week", "alternate days"
    durationMinutes: integer("duration_minutes"),
    timeOfDay: text("time_of_day"), // "morning", "evening"
    daysOfWeek: text("days_of_week"), // JSON: ["mon","wed","fri"]
    sets: integer("sets"),
    reps: integer("reps"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    addedBy: text("added_by", { enum: ["doctor", "patient"] }).notNull().default("patient"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const exerciseRoutinesRelations = relations(exerciseRoutines, ({ one, many }) => ({
    patient: one(users, { fields: [exerciseRoutines.patientId], references: [users.id] }),
    logs: many(exerciseLogs),
}));

// =====================================================
// EXERCISE LOGS (Track completed workouts)
// =====================================================
export const exerciseLogs = sqliteTable("exercise_logs", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    routineId: integer("routine_id").notNull().references(() => exerciseRoutines.id),
    patientId: integer("patient_id").notNull().references(() => users.id),
    status: text("status", { enum: ["completed", "partial", "skipped"] }).notNull(),
    durationMinutes: integer("duration_minutes"),
    notes: text("notes"),
    logDate: text("log_date").notNull(), // "2025-01-15"
    completedAt: integer("completed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const exerciseLogsRelations = relations(exerciseLogs, ({ one }) => ({
    routine: one(exerciseRoutines, { fields: [exerciseLogs.routineId], references: [exerciseRoutines.id] }),
    patient: one(users, { fields: [exerciseLogs.patientId], references: [users.id] }),
}));

// =====================================================
// API KEYS (Developer API Access for SaMD Integration)
// =====================================================
export const apiKeys = sqliteTable("api_keys", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull().references(() => users.id),
    name: text("name").notNull(),                                  // e.g. "Hospital EHR Integration"
    key: text("key").notNull().unique(),                            // vv_live_xxxx or vv_test_xxxx
    prefix: text("prefix").notNull(),                               // first 8 chars for display (vv_live_)
    environment: text("environment", { enum: ["test", "live"] }).notNull().default("test"),
    scopes: text("scopes").notNull().default("predict,ocr"),        // comma-separated: predict,ocr,research,reports
    lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
    requestCount: integer("request_count").notNull().default(0),
    rateLimit: integer("rate_limit").notNull().default(100),        // requests per minute
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
    user: one(users, { fields: [apiKeys.userId], references: [users.id] }),
}));

// =====================================================
// PR1: HOSPITAL FOUNDATION
// =====================================================

// =====================================================
// HOSPITALS
// =====================================================
export const hospitals = sqliteTable("hospitals", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    code: text("code").unique().notNull(),
    slug: text("slug").unique().notNull(),
    name: text("name").notNull(),
    type: text("type", { enum: ["hospital", "clinic", "diagnostic_center", "lab"] }).notNull().default("hospital"),
    addressLine1: text("address_line_1"),
    addressLine2: text("address_line_2"),
    locality: text("locality"),
    city: text("city"),
    state: text("state"),
    pincode: text("pincode"),
    country: text("country").default("India"),
    phone: text("phone"),
    email: text("email"),
    website: text("website"),
    logoUrl: text("logo_url"),
    reportHeaderUrl: text("report_header_url"),
    reportFooterUrl: text("report_footer_url"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const hospitalsRelations = relations(hospitals, ({ many }) => ({
    departments: many(departments),
    memberships: many(hospitalMemberships),
    patientLinks: many(patientHospitalLinks),
}));

// =====================================================
// DEPARTMENTS
// =====================================================
export const departments = sqliteTable("departments", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export const departmentsRelations = relations(departments, ({ one }) => ({
    hospital: one(hospitals, { fields: [departments.hospitalId], references: [hospitals.id] }),
}));

// =====================================================
// SPECIALTIES
// =====================================================
export const specialties = sqliteTable("specialties", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    code: text("code").unique().notNull(),
    name: text("name").notNull(),
    departmentGroup: text("department_group"),
    isDiagnostic: integer("is_diagnostic", { mode: "boolean" }).notNull().default(false),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

// =====================================================
// HOSPITAL MEMBERSHIPS
// =====================================================
export const hospitalMemberships = sqliteTable("hospital_memberships", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").references(() => users.id).notNull(),
    hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
    departmentId: integer("department_id").references(() => departments.id),
    specialtyId: integer("specialty_id").references(() => specialties.id),
    membershipRole: text("membership_role", { enum: ["doctor", "pathologist", "hospital_admin"] }).notNull(),
    title: text("title"),
    employeeCode: text("employee_code"),
    licenseNumber: text("license_number"),
    status: text("status", { enum: ["pending", "active", "inactive", "rejected"] }).notNull().default("active"),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
    joinedAt: integer("joined_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    uniqueMembership: uniqueIndex("hm_user_hospital_role").on(table.userId, table.hospitalId, table.membershipRole),
    idxHospitalRoleStatus: index("hm_hospital_role_status").on(table.hospitalId, table.membershipRole, table.status),
}));

export const hospitalMembershipsRelations = relations(hospitalMemberships, ({ one }) => ({
    user: one(users, { fields: [hospitalMemberships.userId], references: [users.id] }),
    hospital: one(hospitals, { fields: [hospitalMemberships.hospitalId], references: [hospitals.id] }),
    department: one(departments, { fields: [hospitalMemberships.departmentId], references: [departments.id] }),
    specialty: one(specialties, { fields: [hospitalMemberships.specialtyId], references: [specialties.id] }),
}));

// =====================================================
// PATIENT-HOSPITAL LINKS
// =====================================================
export const patientHospitalLinks = sqliteTable("patient_hospital_links", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    patientId: integer("patient_id").references(() => users.id).notNull(),
    hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
    mrn: text("mrn"),
    primaryDoctorMembershipId: integer("primary_doctor_membership_id").references(() => hospitalMemberships.id),
    status: text("status", { enum: ["active", "inactive", "discharged"] }).notNull().default("active"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    uniquePatientHospital: uniqueIndex("phl_patient_hospital").on(table.patientId, table.hospitalId),
    idxHospitalDoctor: index("phl_hospital_doctor").on(table.hospitalId, table.primaryDoctorMembershipId),
}));

export const patientHospitalLinksRelations = relations(patientHospitalLinks, ({ one }) => ({
    patient: one(users, { fields: [patientHospitalLinks.patientId], references: [users.id] }),
    hospital: one(hospitals, { fields: [patientHospitalLinks.hospitalId], references: [hospitals.id] }),
    primaryDoctorMembership: one(hospitalMemberships, { fields: [patientHospitalLinks.primaryDoctorMembershipId], references: [hospitalMemberships.id] }),
}));

// =====================================================
// PR4: CASE WORKFLOW
// =====================================================

// =====================================================
// CASES
// =====================================================
export const cases = sqliteTable("cases", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
    patientId: integer("patient_id").references(() => users.id).notNull(),
    createdByUserId: integer("created_by_user_id").references(() => users.id).notNull(),
    createdByMembershipId: integer("created_by_membership_id").references(() => hospitalMemberships.id),
    sourceRole: text("source_role", { enum: ["doctor", "pathologist", "patient", "system"] }).notNull(),
    primarySpecialtyId: integer("primary_specialty_id").references(() => specialties.id),
    primaryDoctorMembershipId: integer("primary_doctor_membership_id").references(() => hospitalMemberships.id),
    title: text("title"),
    presentingComplaint: text("presenting_complaint"),
    internalSummary: text("internal_summary"),
    status: text("status", { enum: ["new", "triaged", "assigned", "in_review", "signed", "released", "closed"] }).notNull().default("new"),
    priority: text("priority", { enum: ["low", "medium", "high", "critical"] }).notNull().default("medium"),
    patientVisibilityStatus: text("patient_visibility_status", { enum: ["hidden", "released"] }).notNull().default("hidden"),
    openedAt: integer("opened_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
    closedAt: integer("closed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    idxHospitalStatusPriority: index("cases_hospital_status_priority").on(table.hospitalId, table.status, table.priority, table.createdAt),
    idxPatientCreated: index("cases_patient_created").on(table.patientId, table.createdAt),
}));

export const casesRelations = relations(cases, ({ one, many }) => ({
    hospital: one(hospitals, { fields: [cases.hospitalId], references: [hospitals.id] }),
    patient: one(users, { fields: [cases.patientId], references: [users.id] }),
    createdByUser: one(users, { fields: [cases.createdByUserId], references: [users.id] }),
    createdByMembership: one(hospitalMemberships, { fields: [cases.createdByMembershipId], references: [hospitalMemberships.id] }),
    primarySpecialty: one(specialties, { fields: [cases.primarySpecialtyId], references: [specialties.id] }),
    primaryDoctorMembership: one(hospitalMemberships, { fields: [cases.primaryDoctorMembershipId], references: [hospitalMemberships.id] }),
    artifacts: many(caseArtifacts),
    assignments: many(caseAssignments),
    reports: many(caseReports),
}));

// =====================================================
// CASE ARTIFACTS
// =====================================================
export const caseArtifacts = sqliteTable("case_artifacts", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    caseId: integer("case_id").references(() => cases.id).notNull(),
    hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
    patientId: integer("patient_id").references(() => users.id).notNull(),
    uploadedByUserId: integer("uploaded_by_user_id").references(() => users.id).notNull(),
    uploadedByMembershipId: integer("uploaded_by_membership_id").references(() => hospitalMemberships.id),
    artifactType: text("artifact_type", { enum: ["scan_image", "pathology_image", "lab_pdf", "prescription_image", "report_pdf", "other"] }).notNull(),
    processingPipeline: text("processing_pipeline", { enum: ["ml_scan", "ocr_doc", "none"] }).notNull().default("none"),
    fileUrl: text("file_url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    mimeType: text("mime_type"),
    originalFilename: text("original_filename"),
    sizeBytes: integer("size_bytes"),
    modalityHint: text("modality_hint"),
    status: text("status", { enum: ["uploaded", "processing", "processed", "failed"] }).notNull().default("uploaded"),
    processingResultJson: text("processing_result_json"),
    patientVisible: integer("patient_visible", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    idxCaseStatus: index("ca_case_status").on(table.caseId, table.status),
    idxCaseType: index("ca_case_type").on(table.caseId, table.artifactType, table.status),
}));

export const caseArtifactsRelations = relations(caseArtifacts, ({ one }) => ({
    case_: one(cases, { fields: [caseArtifacts.caseId], references: [cases.id] }),
    hospital: one(hospitals, { fields: [caseArtifacts.hospitalId], references: [hospitals.id] }),
    patient: one(users, { fields: [caseArtifacts.patientId], references: [users.id] }),
    uploadedByUser: one(users, { fields: [caseArtifacts.uploadedByUserId], references: [users.id] }),
    uploadedByMembership: one(hospitalMemberships, { fields: [caseArtifacts.uploadedByMembershipId], references: [hospitalMemberships.id] }),
}));

// =====================================================
// CASE ASSIGNMENTS
// =====================================================
export const caseAssignments = sqliteTable("case_assignments", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    caseId: integer("case_id").references(() => cases.id).notNull(),
    assignedToMembershipId: integer("assigned_to_membership_id").references(() => hospitalMemberships.id).notNull(),
    assignedByUserId: integer("assigned_by_user_id").references(() => users.id).notNull(),
    specialtyId: integer("specialty_id").references(() => specialties.id),
    assignmentType: text("assignment_type", { enum: ["primary", "consult", "review"] }).notNull().default("primary"),
    reason: text("reason"),
    status: text("status", { enum: ["pending", "accepted", "completed", "reassigned"] }).notNull().default("pending"),
    dueAt: integer("due_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    acceptedAt: integer("accepted_at", { mode: "timestamp" }),
    completedAt: integer("completed_at", { mode: "timestamp" }),
}, (table) => ({
    uniqueAssignment: uniqueIndex("cas_case_member_type").on(table.caseId, table.assignedToMembershipId, table.assignmentType),
    idxMemberStatus: index("cas_member_status").on(table.assignedToMembershipId, table.status, table.createdAt),
}));

export const caseAssignmentsRelations = relations(caseAssignments, ({ one }) => ({
    case_: one(cases, { fields: [caseAssignments.caseId], references: [cases.id] }),
    assignedToMembership: one(hospitalMemberships, { fields: [caseAssignments.assignedToMembershipId], references: [hospitalMemberships.id] }),
    assignedByUser: one(users, { fields: [caseAssignments.assignedByUserId], references: [users.id] }),
    specialty: one(specialties, { fields: [caseAssignments.specialtyId], references: [specialties.id] }),
}));

// =====================================================
// PR5: TEAM LAYER
// =====================================================

export const careTeams = sqliteTable("care_teams", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
    patientId: integer("patient_id").references(() => users.id).notNull(),
    name: text("name"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const careTeamMembers = sqliteTable("care_team_members", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    careTeamId: integer("care_team_id").references(() => careTeams.id).notNull(),
    membershipId: integer("membership_id").references(() => hospitalMemberships.id).notNull(),
    teamRole: text("team_role", { enum: ["primary_doctor", "consultant", "pathologist"] }).notNull(),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const careTeamsRelations = relations(careTeams, ({ one, many }) => ({
    hospital: one(hospitals, { fields: [careTeams.hospitalId], references: [hospitals.id] }),
    patient: one(users, { fields: [careTeams.patientId], references: [users.id] }),
    members: many(careTeamMembers),
}));

export const careTeamMembersRelations = relations(careTeamMembers, ({ one }) => ({
    careTeam: one(careTeams, { fields: [careTeamMembers.careTeamId], references: [careTeams.id] }),
    membership: one(hospitalMemberships, { fields: [careTeamMembers.membershipId], references: [hospitalMemberships.id] }),
}));

// =====================================================
// PR6: REPORTING
// =====================================================

// =====================================================
// HOSPITAL REPORT TEMPLATES
// =====================================================
export const hospitalReportTemplates = sqliteTable("hospital_report_templates", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
    name: text("name").notNull(),
    version: integer("version").notNull().default(1),
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    headerImageUrl: text("header_image_url"),
    footerImageUrl: text("footer_image_url"),
    logoUrl: text("logo_url"),
    sectionSchemaJson: text("section_schema_json"), // JSON defining report sections
    disclaimerText: text("disclaimer_text"),
    signatureConfigJson: text("signature_config_json"), // JSON for signature fields
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    uniqueHospitalNameVersion: uniqueIndex("hrt_hospital_name_version").on(table.hospitalId, table.name, table.version),
}));

export const hospitalReportTemplatesRelations = relations(hospitalReportTemplates, ({ one }) => ({
    hospital: one(hospitals, { fields: [hospitalReportTemplates.hospitalId], references: [hospitals.id] }),
}));

// =====================================================
// CASE REPORTS
// =====================================================
export const caseReports = sqliteTable("case_reports", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    caseId: integer("case_id").references(() => cases.id).notNull(),
    hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
    templateId: integer("template_id").references(() => hospitalReportTemplates.id),
    authoredByUserId: integer("authored_by_user_id").references(() => users.id).notNull(),
    authoredByMembershipId: integer("authored_by_membership_id").references(() => hospitalMemberships.id),
    status: text("status", { enum: ["draft", "signed", "released", "archived"] }).notNull().default("draft"),
    title: text("title"),
    contentJson: text("content_json"),
    htmlSnapshot: text("html_snapshot"),
    pdfUrl: text("pdf_url"),
    patientSummary: text("patient_summary"),
    releasedMedicationsJson: text("released_medications_json"),
    signedAt: integer("signed_at", { mode: "timestamp" }),
    releasedAt: integer("released_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    idxCaseStatus: index("cr_case_status").on(table.caseId, table.status, table.updatedAt),
}));

export const caseReportsRelations = relations(caseReports, ({ one, many }) => ({
    case_: one(cases, { fields: [caseReports.caseId], references: [cases.id] }),
    hospital: one(hospitals, { fields: [caseReports.hospitalId], references: [hospitals.id] }),
    template: one(hospitalReportTemplates, { fields: [caseReports.templateId], references: [hospitalReportTemplates.id] }),
    authoredByUser: one(users, { fields: [caseReports.authoredByUserId], references: [users.id] }),
    authoredByMembership: one(hospitalMemberships, { fields: [caseReports.authoredByMembershipId], references: [hospitalMemberships.id] }),
    versions: many(caseReportVersions),
}));

// =====================================================
// CASE REPORT VERSIONS
// =====================================================
export const caseReportVersions = sqliteTable("case_report_versions", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    reportId: integer("report_id").references(() => caseReports.id).notNull(),
    versionNumber: integer("version_number").notNull(),
    editedByUserId: integer("edited_by_user_id").references(() => users.id).notNull(),
    editedByMembershipId: integer("edited_by_membership_id").references(() => hospitalMemberships.id),
    contentJson: text("content_json"),
    htmlSnapshot: text("html_snapshot"),
    changeSummary: text("change_summary"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    uniqueReportVersion: uniqueIndex("crv_report_version").on(table.reportId, table.versionNumber),
}));

export const caseReportVersionsRelations = relations(caseReportVersions, ({ one }) => ({
    report: one(caseReports, { fields: [caseReportVersions.reportId], references: [caseReports.id] }),
    editedByUser: one(users, { fields: [caseReportVersions.editedByUserId], references: [users.id] }),
    editedByMembership: one(hospitalMemberships, { fields: [caseReportVersions.editedByMembershipId], references: [hospitalMemberships.id] }),
}));
