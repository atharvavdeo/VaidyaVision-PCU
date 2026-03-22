CREATE TABLE "patient_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"content" text NOT NULL,
	"linked_to_type" text,
	"linked_to_id" integer,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_type" text,
	"file_size" integer,
	"linked_to_type" text,
	"linked_to_id" integer,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctor_prescriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctor_prescription_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"doctor_prescription_id" integer NOT NULL,
	"medicine_name" text NOT NULL,
	"dosage" text,
	"frequency" text,
	"duration" text,
	"directions" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_allergies" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"allergen" text NOT NULL,
	"severity" text,
	"notes" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_conditions" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"condition" text NOT NULL,
	"diagnosed_at" text,
	"status" text,
	"notes" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "patient_notes" ADD CONSTRAINT "patient_notes_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "patient_notes" ADD CONSTRAINT "patient_notes_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "patient_files" ADD CONSTRAINT "patient_files_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "patient_files" ADD CONSTRAINT "patient_files_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "doctor_prescriptions" ADD CONSTRAINT "doctor_prescriptions_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "doctor_prescriptions" ADD CONSTRAINT "doctor_prescriptions_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "doctor_prescription_items" ADD CONSTRAINT "doctor_prescription_items_doctor_prescription_id_doctor_prescriptions_id_fk" FOREIGN KEY ("doctor_prescription_id") REFERENCES "public"."doctor_prescriptions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "patient_allergies" ADD CONSTRAINT "patient_allergies_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "patient_conditions" ADD CONSTRAINT "patient_conditions_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_patient_notes_patient_id" ON "patient_notes" USING btree ("patient_id");
--> statement-breakpoint
CREATE INDEX "idx_patient_notes_doctor_id" ON "patient_notes" USING btree ("doctor_id");
--> statement-breakpoint
CREATE INDEX "idx_patient_files_patient_id" ON "patient_files" USING btree ("patient_id");
--> statement-breakpoint
CREATE INDEX "idx_doctor_prescriptions_patient_id" ON "doctor_prescriptions" USING btree ("patient_id");
--> statement-breakpoint
CREATE INDEX "idx_dpi_prescription_id" ON "doctor_prescription_items" USING btree ("doctor_prescription_id");
--> statement-breakpoint
CREATE INDEX "idx_patient_allergies_patient_id" ON "patient_allergies" USING btree ("patient_id");
--> statement-breakpoint
CREATE INDEX "idx_patient_conditions_patient_id" ON "patient_conditions" USING btree ("patient_id");
