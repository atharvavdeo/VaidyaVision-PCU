CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"prefix" text NOT NULL,
	"environment" text DEFAULT 'test' NOT NULL,
	"scopes" text DEFAULT 'predict,ocr' NOT NULL,
	"last_used_at" timestamp,
	"request_count" integer DEFAULT 0 NOT NULL,
	"rate_limit" integer DEFAULT 100 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "api_keys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "appointment_intents" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"report_id" integer NOT NULL,
	"delivery_id" integer,
	"intent_token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"selected_slot" timestamp,
	"booked_appointment_id" integer,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "appointment_intents_intent_token_unique" UNIQUE("intent_token")
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"type" text DEFAULT 'follow_up' NOT NULL,
	"notes" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"source" text DEFAULT 'portal' NOT NULL,
	"source_ref" text,
	"created_at" timestamp NOT NULL,
	"hospital_id" integer
);
--> statement-breakpoint
CREATE TABLE "call_outcomes" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"report_id" integer NOT NULL,
	"responded" boolean DEFAULT false NOT NULL,
	"response_code" text,
	"last_contact_at" timestamp DEFAULT now(),
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "care_team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"care_team_id" integer NOT NULL,
	"membership_id" integer NOT NULL,
	"team_role" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "care_teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_artifacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"hospital_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"uploaded_by_user_id" integer NOT NULL,
	"uploaded_by_membership_id" integer,
	"artifact_type" text NOT NULL,
	"processing_pipeline" text DEFAULT 'none' NOT NULL,
	"file_url" text NOT NULL,
	"thumbnail_url" text,
	"mime_type" text,
	"original_filename" text,
	"size_bytes" integer,
	"modality_hint" text,
	"status" text DEFAULT 'uploaded' NOT NULL,
	"processing_result_json" jsonb,
	"patient_visible" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"assigned_to_membership_id" integer NOT NULL,
	"assigned_by_user_id" integer NOT NULL,
	"specialty_id" integer,
	"assignment_type" text DEFAULT 'primary' NOT NULL,
	"reason" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"due_at" timestamp,
	"created_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "case_report_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer NOT NULL,
	"version_number" integer NOT NULL,
	"edited_by_user_id" integer NOT NULL,
	"edited_by_membership_id" integer,
	"content_json" jsonb,
	"html_snapshot" text,
	"change_summary" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"hospital_id" integer NOT NULL,
	"template_id" integer,
	"authored_by_user_id" integer NOT NULL,
	"authored_by_membership_id" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"title" text,
	"content_json" jsonb,
	"html_snapshot" text,
	"pdf_url" text,
	"patient_summary" text,
	"released_medications_json" jsonb,
	"signed_at" timestamp,
	"released_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"created_by_user_id" integer NOT NULL,
	"created_by_membership_id" integer,
	"source_role" text NOT NULL,
	"primary_specialty_id" integer,
	"primary_doctor_membership_id" integer,
	"title" text,
	"presenting_complaint" text,
	"internal_summary" text,
	"status" text DEFAULT 'new' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"patient_visibility_status" text DEFAULT 'hidden' NOT NULL,
	"opened_at" timestamp DEFAULT now(),
	"closed_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"last_message_at" timestamp,
	"created_at" timestamp NOT NULL,
	"hospital_id" integer
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" integer NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctor_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"specialty" text DEFAULT 'General Medicine' NOT NULL,
	"specialty_id" integer,
	"degree" text DEFAULT 'MBBS' NOT NULL,
	"experience" integer DEFAULT 0,
	"license_number" text,
	"rating" real DEFAULT 5,
	"total_consultations" integer DEFAULT 0,
	"total_scans_reviewed" integer DEFAULT 0,
	CONSTRAINT "doctor_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "email_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"provider" text DEFAULT 'gmail' NOT NULL,
	"provider_email" text NOT NULL,
	"access_token_encrypted" text NOT NULL,
	"refresh_token_encrypted" text NOT NULL,
	"expires_at" timestamp,
	"scope" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"routine_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"status" text NOT NULL,
	"duration_minutes" integer,
	"notes" text,
	"log_date" text NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_routines" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"doctor_id" integer,
	"name" text NOT NULL,
	"type" text DEFAULT 'other' NOT NULL,
	"description" text,
	"frequency" text,
	"duration_minutes" integer,
	"time_of_day" text,
	"days_of_week" text,
	"sets" integer,
	"reps" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"added_by" text DEFAULT 'patient' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"relation" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follow_ups" (
	"id" serial PRIMARY KEY NOT NULL,
	"scan_id" integer,
	"patient_id" integer,
	"scheduled_for" integer NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hospital_memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"hospital_id" integer NOT NULL,
	"department_id" integer,
	"specialty_id" integer,
	"membership_role" text NOT NULL,
	"title" text,
	"employee_code" text,
	"license_number" text,
	"status" text DEFAULT 'active' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hospital_report_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" integer NOT NULL,
	"name" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"header_image_url" text,
	"footer_image_url" text,
	"logo_url" text,
	"section_schema_json" jsonb,
	"disclaimer_text" text,
	"signature_config_json" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hospitals" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'hospital' NOT NULL,
	"address_line_1" text,
	"address_line_2" text,
	"locality" text,
	"city" text,
	"state" text,
	"pincode" text,
	"country" text DEFAULT 'India',
	"phone" text,
	"email" text,
	"website" text,
	"logo_url" text,
	"report_header_url" text,
	"report_footer_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "hospitals_code_unique" UNIQUE("code"),
	CONSTRAINT "hospitals_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "medication_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"medication_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"status" text NOT NULL,
	"scheduled_time" text,
	"taken_at" timestamp,
	"notes" text,
	"log_date" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medications" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"prescription_id" integer,
	"doctor_id" integer,
	"drug_name" text NOT NULL,
	"dosage" text,
	"form" text,
	"frequency" text,
	"time_of_day" text,
	"duration" text,
	"start_date" text,
	"end_date" text,
	"instructions" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"added_by" text DEFAULT 'ocr' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"content" text NOT NULL,
	"type" text DEFAULT 'text' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"link" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_hospital_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"hospital_id" integer NOT NULL,
	"mrn" text,
	"primary_doctor_membership_id" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prescriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"image_url" text NOT NULL,
	"document_type" text DEFAULT 'prescription' NOT NULL,
	"ocr_confidence" real,
	"ocr_method" text,
	"raw_text" text,
	"cleaned_text" text,
	"structured_data" text,
	"prescribing_doctor" text,
	"prescription_date" text,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"hospital_id" integer,
	"case_id" integer,
	"source_artifact_id" integer
);
--> statement-breakpoint
CREATE TABLE "report_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer NOT NULL,
	"channel" text NOT NULL,
	"provider" text DEFAULT 'gmail' NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"external_id" text,
	"provider_message_sid" text,
	"error_message" text,
	"last_error" text,
	"attempt_count" integer DEFAULT 0,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"scan_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"diagnosis" text NOT NULL,
	"findings" text NOT NULL,
	"recommendations" text,
	"severity" text DEFAULT 'moderate' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"template_id" integer,
	"hospital_template_id" integer,
	"signed_at" timestamp,
	"released_at" timestamp,
	"pdf_url" text,
	"delivery_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp NOT NULL,
	"case_id" integer
);
--> statement-breakpoint
CREATE TABLE "scans" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"doctor_id" integer,
	"image_url" text NOT NULL,
	"audio_url" text,
	"spectrogram_url" text,
	"modality" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"symptoms" text,
	"triage_score" integer,
	"ai_diagnosis" text,
	"ai_confidence" real,
	"ai_uncertainty" real,
	"heatmap_url" text,
	"expert_used" text,
	"doctor_notes" text,
	"original_filename" text,
	"uploaded_at" timestamp NOT NULL,
	"reviewed_at" timestamp,
	"hospital_id" integer,
	"case_id" integer,
	"source_artifact_id" integer
);
--> statement-breakpoint
CREATE TABLE "specialties" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"department_group" text,
	"is_diagnostic" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "specialties_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"structure_json" text NOT NULL,
	"language" text DEFAULT 'en' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_id" text NOT NULL,
	"role" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"image_url" text,
	"specialty" text,
	"hospital_id" integer,
	"age" integer,
	"gender" text,
	"blood_type" text,
	"medical_history" text,
	"phone" text,
	"is_onboarded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "voice_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"scan_id" integer,
	"transcription" text NOT NULL,
	"audio_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_intents" ADD CONSTRAINT "appointment_intents_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_intents" ADD CONSTRAINT "appointment_intents_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_intents" ADD CONSTRAINT "appointment_intents_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_intents" ADD CONSTRAINT "appointment_intents_delivery_id_report_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."report_deliveries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_intents" ADD CONSTRAINT "appointment_intents_booked_appointment_id_appointments_id_fk" FOREIGN KEY ("booked_appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_outcomes" ADD CONSTRAINT "call_outcomes_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_outcomes" ADD CONSTRAINT "call_outcomes_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_outcomes" ADD CONSTRAINT "call_outcomes_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_team_members" ADD CONSTRAINT "care_team_members_care_team_id_care_teams_id_fk" FOREIGN KEY ("care_team_id") REFERENCES "public"."care_teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_team_members" ADD CONSTRAINT "care_team_members_membership_id_hospital_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."hospital_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_teams" ADD CONSTRAINT "care_teams_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_teams" ADD CONSTRAINT "care_teams_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_artifacts" ADD CONSTRAINT "case_artifacts_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_artifacts" ADD CONSTRAINT "case_artifacts_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_artifacts" ADD CONSTRAINT "case_artifacts_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_artifacts" ADD CONSTRAINT "case_artifacts_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_artifacts" ADD CONSTRAINT "case_artifacts_uploaded_by_membership_id_hospital_memberships_id_fk" FOREIGN KEY ("uploaded_by_membership_id") REFERENCES "public"."hospital_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_assigned_to_membership_id_hospital_memberships_id_fk" FOREIGN KEY ("assigned_to_membership_id") REFERENCES "public"."hospital_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_assigned_by_user_id_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_specialty_id_specialties_id_fk" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_report_versions" ADD CONSTRAINT "case_report_versions_report_id_case_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."case_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_report_versions" ADD CONSTRAINT "case_report_versions_edited_by_user_id_users_id_fk" FOREIGN KEY ("edited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_report_versions" ADD CONSTRAINT "case_report_versions_edited_by_membership_id_hospital_memberships_id_fk" FOREIGN KEY ("edited_by_membership_id") REFERENCES "public"."hospital_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_reports" ADD CONSTRAINT "case_reports_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_reports" ADD CONSTRAINT "case_reports_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_reports" ADD CONSTRAINT "case_reports_template_id_hospital_report_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."hospital_report_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_reports" ADD CONSTRAINT "case_reports_authored_by_user_id_users_id_fk" FOREIGN KEY ("authored_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_reports" ADD CONSTRAINT "case_reports_authored_by_membership_id_hospital_memberships_id_fk" FOREIGN KEY ("authored_by_membership_id") REFERENCES "public"."hospital_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_created_by_membership_id_hospital_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."hospital_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_primary_specialty_id_specialties_id_fk" FOREIGN KEY ("primary_specialty_id") REFERENCES "public"."specialties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_primary_doctor_membership_id_hospital_memberships_id_fk" FOREIGN KEY ("primary_doctor_membership_id") REFERENCES "public"."hospital_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_connections" ADD CONSTRAINT "email_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_logs" ADD CONSTRAINT "exercise_logs_routine_id_exercise_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."exercise_routines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_logs" ADD CONSTRAINT "exercise_logs_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_routines" ADD CONSTRAINT "exercise_routines_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_routines" ADD CONSTRAINT "exercise_routines_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_memberships" ADD CONSTRAINT "hospital_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_memberships" ADD CONSTRAINT "hospital_memberships_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_memberships" ADD CONSTRAINT "hospital_memberships_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_memberships" ADD CONSTRAINT "hospital_memberships_specialty_id_specialties_id_fk" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_report_templates" ADD CONSTRAINT "hospital_report_templates_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_logs" ADD CONSTRAINT "medication_logs_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_logs" ADD CONSTRAINT "medication_logs_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_hospital_links" ADD CONSTRAINT "patient_hospital_links_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_hospital_links" ADD CONSTRAINT "patient_hospital_links_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_hospital_links" ADD CONSTRAINT "patient_hospital_links_primary_doctor_membership_id_hospital_memberships_id_fk" FOREIGN KEY ("primary_doctor_membership_id") REFERENCES "public"."hospital_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_deliveries" ADD CONSTRAINT "report_deliveries_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_hospital_template_id_hospital_report_templates_id_fk" FOREIGN KEY ("hospital_template_id") REFERENCES "public"."hospital_report_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_notes" ADD CONSTRAINT "voice_notes_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ca_case_status" ON "case_artifacts" USING btree ("case_id","status");--> statement-breakpoint
CREATE INDEX "ca_case_type" ON "case_artifacts" USING btree ("case_id","artifact_type","status");--> statement-breakpoint
CREATE UNIQUE INDEX "cas_case_member_type" ON "case_assignments" USING btree ("case_id","assigned_to_membership_id","assignment_type");--> statement-breakpoint
CREATE INDEX "cas_member_status" ON "case_assignments" USING btree ("assigned_to_membership_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "crv_report_version" ON "case_report_versions" USING btree ("report_id","version_number");--> statement-breakpoint
CREATE INDEX "cr_case_status" ON "case_reports" USING btree ("case_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "cases_hospital_status_priority" ON "cases" USING btree ("hospital_id","status","priority","created_at");--> statement-breakpoint
CREATE INDEX "cases_patient_created" ON "cases" USING btree ("patient_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ec_user_provider" ON "email_connections" USING btree ("user_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "hm_user_hospital_role" ON "hospital_memberships" USING btree ("user_id","hospital_id","membership_role");--> statement-breakpoint
CREATE INDEX "hm_hospital_role_status" ON "hospital_memberships" USING btree ("hospital_id","membership_role","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hrt_hospital_name_version" ON "hospital_report_templates" USING btree ("hospital_id","name","version");--> statement-breakpoint
CREATE UNIQUE INDEX "phl_patient_hospital" ON "patient_hospital_links" USING btree ("patient_id","hospital_id");--> statement-breakpoint
CREATE INDEX "phl_hospital_doctor" ON "patient_hospital_links" USING btree ("hospital_id","primary_doctor_membership_id");