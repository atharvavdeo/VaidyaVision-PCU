# DB_CONDITION.md
## Current Database State

### Meta

- ORM: Drizzle ORM (`drizzle-orm` with `drizzle-orm/better-sqlite3`)
- Database engine: SQLite (`better-sqlite3`)
- Database path or connection string pattern: `./data/vaidyavision.db` (also `path.join(process.cwd(), "data", "vaidyavision.db")`)
- Migration tool: Drizzle Kit
- Migration folder: `./drizzle`
- Naming convention: mixed (DB: snake_case table/column names, TS schema fields: camelCase)

---

### Tables

#### `users`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| clerk_id | text | no | none | no | none |
| role | text enum (`patient`,`doctor`,`admin`,`pathologist`,`hospital_admin`) | no | none | no | none |
| name | text | no | none | no | none |
| email | text | no | none | no | none |
| image_url | text | yes | none | no | none |
| specialty | text | yes | none | no | none |
| hospital_id | integer | yes | none | no | none |
| age | integer | yes | none | no | none |
| gender | text | yes | none | no | none |
| blood_type | text | yes | none | no | none |
| medical_history | text | yes | none | no | none |
| phone | text | yes | none | no | none |
| is_onboarded | integer (boolean) | no | false | no | none |
| created_at | integer (timestamp) | no | `$defaultFn(() => new Date())` | no | none |

Enums used in this table: `role`
Indexes: none
Unique constraints: `clerk_id` unique, `email` unique

---

#### `doctor_profiles`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| user_id | integer | no | none | no | users.id |
| specialty | text | no | `General Medicine` | no | none |
| specialty_id | integer | yes | none | no | none |
| degree | text | no | `MBBS` | no | none |
| experience | integer | yes | 0 | no | none |
| license_number | text | yes | none | no | none |
| rating | real | yes | 5.0 | no | none |
| total_consultations | integer | yes | 0 | no | none |
| total_scans_reviewed | integer | yes | 0 | no | none |

Enums used in this table: none
Indexes: none
Unique constraints: `user_id` unique

---

#### `scans`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| patient_id | integer | no | none | no | users.id |
| doctor_id | integer | yes | none | no | users.id |
| image_url | text | no | none | no | none |
| modality | text enum (`brain`,`lung`,`skin`,`ecg`) | no | none | no | none |
| status | text enum (`pending`,`processing`,`completed`,`rejected`) | no | `pending` | no | none |
| priority | text enum (`low`,`medium`,`high`,`critical`) | no | `medium` | no | none |
| symptoms | text | yes | none | no | none |
| triage_score | integer | yes | none | no | none |
| ai_diagnosis | text | yes | none | no | none |
| ai_confidence | real | yes | none | no | none |
| ai_uncertainty | real | yes | none | no | none |
| heatmap_url | text | yes | none | no | none |
| expert_used | text | yes | none | no | none |
| doctor_notes | text | yes | none | no | none |
| original_filename | text | yes | none | no | none |
| uploaded_at | integer (timestamp) | no | `$defaultFn(() => new Date())` | no | none |
| reviewed_at | integer (timestamp) | yes | none | no | none |
| hospital_id | integer | yes | none | no | none |
| case_id | integer | yes | none | no | none |
| source_artifact_id | integer | yes | none | no | none |

Enums used in this table: `modality`, `status`, `priority`
Indexes: none
Unique constraints: none

---

#### `reports`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| scan_id | integer | no | none | no | scans.id |
| patient_id | integer | no | none | no | users.id |
| doctor_id | integer | no | none | no | users.id |
| diagnosis | text | no | none | no | none |
| findings | text | no | none | no | none |
| recommendations | text | yes | none | no | none |
| severity | text enum (`low`,`moderate`,`high`,`critical`) | no | `moderate` | no | none |
| status | text enum (`draft`,`signed`) | no | `draft` | no | none |
| language | text | no | `en` | no | none |
| template_id | integer | yes | none | no | templates.id |
| signed_at | integer (timestamp) | yes | none | no | none |
| pdf_url | text | yes | none | no | none |
| created_at | integer (timestamp) | no | `$defaultFn(() => new Date())` | no | none |
| case_id | integer | yes | none | no | none |

Enums used in this table: `severity`, `status`
Indexes: none
Unique constraints: none

---

#### `conversations`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| patient_id | integer | no | none | no | users.id |
| doctor_id | integer | no | none | no | users.id |
| last_message_at | integer (timestamp) | yes | none | no | none |
| created_at | integer (timestamp) | no | `$defaultFn(() => new Date())` | no | none |
| hospital_id | integer | yes | none | no | none |

Enums used in this table: none
Indexes: none
Unique constraints: none

---

#### `messages`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| conversation_id | integer | no | none | no | conversations.id |
| sender_id | integer | no | none | no | users.id |
| content | text | no | none | no | none |
| type | text enum (`text`,`scan`,`report`) | no | `text` | no | none |
| created_at | integer (timestamp) | no | `$defaultFn(() => new Date())` | no | none |

Enums used in this table: `type`
Indexes: none
Unique constraints: none

---

#### `appointments`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| patient_id | integer | no | none | no | users.id |
| doctor_id | integer | no | none | no | users.id |
| scheduled_at | integer (timestamp) | no | none | no | none |
| type | text enum (`initial`,`follow_up`,`emergency`,`review`) | no | `follow_up` | no | none |
| notes | text | yes | none | no | none |
| status | text enum (`scheduled`,`confirmed`,`completed`,`cancelled`) | no | `scheduled` | no | none |
| created_at | integer (timestamp) | no | `$defaultFn(() => new Date())` | no | none |
| hospital_id | integer | yes | none | no | none |

Enums used in this table: `type`, `status`
Indexes: none
Unique constraints: none

---

#### `templates`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| name | text | no | none | no | none |
| structure_json | text | no | none | no | none |
| language | text | no | `en` | no | none |

Enums used in this table: none
Indexes: none
Unique constraints: none

---

#### `notifications`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| user_id | integer | no | none | no | users.id |
| type | text enum (`scan_ready`,`report_signed`,`urgent_alert`,`message_received`,`appointment`,`appointment_scheduled`,`scan_completed`,`case_assigned`) | no | none | no | none |
| message | text | no | none | no | none |
| link | text | yes | none | no | none |
| is_read | integer (boolean) | no | false | no | none |
| created_at | integer (timestamp) | no | `$defaultFn(() => new Date())` | no | none |

Enums used in this table: `type`
Indexes: none
Unique constraints: none

---

#### `family_members`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| patient_id | integer | no | none | no | users.id |
| relation | text | no | none | no | none |
| name | text | no | none | no | none |

Enums used in this table: none
Indexes: none
Unique constraints: none

---

#### `follow_ups`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| scan_id | integer | yes | none | no | scans.id |
| patient_id | integer | yes | none | no | users.id |
| scheduled_for | integer | no | none | no | none |
| type | text enum (`email`,`call`) | no | none | no | none |
| status | text enum (`pending`,`sent`,`failed`,`cancelled`) | yes | `pending` | no | none |
| created_at | integer | yes | `unixepoch()` | no | none |

Enums used in this table: `type`, `status`
Indexes: none
Unique constraints: none

---

#### `voice_notes`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| scan_id | integer | yes | none | no | scans.id |
| transcription | text | no | none | no | none |
| audio_url | text | yes | none | no | none |
| created_at | integer | yes | `unixepoch()` | no | none |

Enums used in this table: none
Indexes: none
Unique constraints: none

---

#### `prescriptions`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| patient_id | integer | no | none | no | users.id |
| image_url | text | no | none | no | none |
| document_type | text | no | `prescription` | no | none |
| ocr_confidence | real | yes | none | no | none |
| ocr_method | text | yes | none | no | none |
| raw_text | text | yes | none | no | none |
| cleaned_text | text | yes | none | no | none |
| structured_data | text | yes | none | no | none |
| prescribing_doctor | text | yes | none | no | none |
| prescription_date | text | yes | none | no | none |
| uploaded_at | text | no | `datetime('now')` | no | none |
| hospital_id | integer | yes | none | no | none |
| case_id | integer | yes | none | no | none |
| source_artifact_id | integer | yes | none | no | none |

Enums used in this table: none
Indexes: none
Unique constraints: none

---

#### `medications`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| patient_id | integer | no | none | no | users.id |
| prescription_id | integer | yes | none | no | prescriptions.id |
| doctor_id | integer | yes | none | no | users.id |
| drug_name | text | no | none | no | none |
| dosage | text | yes | none | no | none |
| form | text | yes | none | no | none |
| frequency | text | yes | none | no | none |
| time_of_day | text | yes | none | no | none |
| duration | text | yes | none | no | none |
| start_date | text | yes | none | no | none |
| end_date | text | yes | none | no | none |
| instructions | text | yes | none | no | none |
| is_active | integer (boolean) | no | true | no | none |
| added_by | text enum (`ocr`,`doctor`,`patient`) | no | `ocr` | no | none |
| created_at | integer (timestamp) | no | `$defaultFn(() => new Date())` | no | none |
| updated_at | integer (timestamp) | no | `$defaultFn(() => new Date())` | no | none |

Enums used in this table: `added_by`
Indexes: none
Unique constraints: none

---

#### `medication_logs`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| medication_id | integer | no | none | no | medications.id |
| patient_id | integer | no | none | no | users.id |
| status | text enum (`taken`,`missed`,`skipped`) | no | none | no | none |
| scheduled_time | text | yes | none | no | none |
| taken_at | integer (timestamp) | yes | none | no | none |
| notes | text | yes | none | no | none |
| log_date | text | no | none | no | none |
| created_at | integer (timestamp) | no | `$defaultFn(() => new Date())` | no | none |

Enums used in this table: `status`
Indexes: none
Unique constraints: none

---

#### `exercise_routines`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| patient_id | integer | no | none | no | users.id |
| doctor_id | integer | yes | none | no | users.id |
| name | text | no | none | no | none |
| type | text enum (`cardio`,`strength`,`flexibility`,`physio`,`yoga`,`walking`,`other`) | no | `other` | no | none |
| description | text | yes | none | no | none |
| frequency | text | yes | none | no | none |
| duration_minutes | integer | yes | none | no | none |
| time_of_day | text | yes | none | no | none |
| days_of_week | text | yes | none | no | none |
| sets | integer | yes | none | no | none |
| reps | integer | yes | none | no | none |
| is_active | integer (boolean) | no | true | no | none |
| added_by | text enum (`doctor`,`patient`) | no | `patient` | no | none |
| created_at | integer (timestamp) | no | `$defaultFn(() => new Date())` | no | none |

Enums used in this table: `type`, `added_by`
Indexes: none
Unique constraints: none

---

#### `exercise_logs`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| routine_id | integer | no | none | no | exercise_routines.id |
| patient_id | integer | no | none | no | users.id |
| status | text enum (`completed`,`partial`,`skipped`) | no | none | no | none |
| duration_minutes | integer | yes | none | no | none |
| notes | text | yes | none | no | none |
| log_date | text | no | none | no | none |
| completed_at | integer (timestamp) | yes | none | no | none |
| created_at | integer (timestamp) | no | `$defaultFn(() => new Date())` | no | none |

Enums used in this table: `status`
Indexes: none
Unique constraints: none

---

#### `api_keys`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| user_id | integer | no | none | no | users.id |
| name | text | no | none | no | none |
| key | text | no | none | no | none |
| prefix | text | no | none | no | none |
| environment | text enum (`test`,`live`) | no | `test` | no | none |
| scopes | text | no | `predict,ocr` | no | none |
| last_used_at | integer (timestamp) | yes | none | no | none |
| request_count | integer | no | 0 | no | none |
| rate_limit | integer | no | 100 | no | none |
| is_active | integer (boolean) | no | true | no | none |
| expires_at | integer (timestamp) | yes | none | no | none |
| created_at | integer (timestamp) | no | `$defaultFn(() => new Date())` | no | none |

Enums used in this table: `environment`
Indexes: none
Unique constraints: `key` unique

---

#### `hospitals`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| code | text | no | none | no | none |
| slug | text | no | none | no | none |
| name | text | no | none | no | none |
| type | text enum (`hospital`,`clinic`,`diagnostic_center`,`lab`) | no | `hospital` | no | none |
| address_line_1 | text | yes | none | no | none |
| address_line_2 | text | yes | none | no | none |
| locality | text | yes | none | no | none |
| city | text | yes | none | no | none |
| state | text | yes | none | no | none |
| pincode | text | yes | none | no | none |
| country | text | yes | `India` | no | none |
| phone | text | yes | none | no | none |
| email | text | yes | none | no | none |
| website | text | yes | none | no | none |
| logo_url | text | yes | none | no | none |
| report_header_url | text | yes | none | no | none |
| report_footer_url | text | yes | none | no | none |
| is_active | integer (boolean) | no | true | no | none |
| created_at | integer (timestamp) | no | `$defaultFn(() => new Date())` | no | none |
| updated_at | integer (timestamp) | no | `$defaultFn(() => new Date())` | no | none |

Enums used in this table: `type`
Indexes: none
Unique constraints: `code` unique, `slug` unique

---

#### `departments`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| hospital_id | integer | no | none | no | hospitals.id |
| code | text | no | none | no | none |
| name | text | no | none | no | none |
| is_active | integer (boolean) | no | true | no | none |

Enums used in this table: none
Indexes: none
Unique constraints: none

---

#### `specialties`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| code | text | no | none | no | none |
| name | text | no | none | no | none |
| department_group | text | yes | none | no | none |
| is_diagnostic | integer (boolean) | no | false | no | none |
| is_active | integer (boolean) | no | true | no | none |

Enums used in this table: none
Indexes: none
Unique constraints: `code` unique

---

#### `hospital_memberships`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| user_id | integer | no | none | no | users.id |
| hospital_id | integer | no | none | no | hospitals.id |
| department_id | integer | yes | none | no | departments.id |
| specialty_id | integer | yes | none | no | specialties.id |
| membership_role | text enum (`doctor`,`pathologist`,`hospital_admin`) | no | none | no | none |
| title | text | yes | none | no | none |
| employee_code | text | yes | none | no | none |
| license_number | text | yes | none | no | none |
| status | text enum (`pending`,`active`,`inactive`,`rejected`) | no | `active` | no | none |
| is_primary | integer (boolean) | no | false | no | none |
| joined_at | integer (timestamp) | yes | `$defaultFn(() => new Date())` | no | none |
| created_at | integer (timestamp) | no | `$defaultFn(() => new Date())` | no | none |

Enums used in this table: `membership_role`, `status`
Indexes: `hm_hospital_role_status` on (`hospital_id`,`membership_role`,`status`)
Unique constraints: `hm_user_hospital_role` on (`user_id`,`hospital_id`,`membership_role`)

---

#### `patient_hospital_links`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| patient_id | integer | no | none | no | users.id |
| hospital_id | integer | no | none | no | hospitals.id |
| mrn | text | yes | none | no | none |
| primary_doctor_membership_id | integer | yes | none | no | hospital_memberships.id |
| status | text enum (`active`,`inactive`,`discharged`) | no | `active` | no | none |
| created_at | integer (timestamp) | no | `$defaultFn(() => new Date())` | no | none |

Enums used in this table: `status`
Indexes: `phl_hospital_doctor` on (`hospital_id`,`primary_doctor_membership_id`)
Unique constraints: `phl_patient_hospital` on (`patient_id`,`hospital_id`)

---

#### `cases`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| hospital_id | integer | no | none | no | hospitals.id |
| patient_id | integer | no | none | no | users.id |
| created_by_user_id | integer | no | none | no | users.id |
| created_by_membership_id | integer | yes | none | no | hospital_memberships.id |
| source_role | text enum (`doctor`,`pathologist`,`patient`,`system`) | no | none | no | none |
| primary_specialty_id | integer | yes | none | no | specialties.id |
| primary_doctor_membership_id | integer | yes | none | no | hospital_memberships.id |
| title | text | yes | none | no | none |
| presenting_complaint | text | yes | none | no | none |
| internal_summary | text | yes | none | no | none |
| status | text enum (`new`,`triaged`,`assigned`,`in_review`,`signed`,`released`,`closed`) | no | `new` | no | none |
| priority | text enum (`low`,`medium`,`high`,`critical`) | no | `medium` | no | none |
| patient_visibility_status | text enum (`hidden`,`released`) | no | `hidden` | no | none |
| opened_at | integer (timestamp) | yes | `$defaultFn(() => new Date())` | no | none |
| closed_at | integer (timestamp) | yes | none | no | none |
| created_at | integer (timestamp) | no | `$defaultFn(() => new Date())` | no | none |
| updated_at | integer (timestamp) | no | `$defaultFn(() => new Date())` | no | none |

Enums used in this table: `source_role`, `status`, `priority`, `patient_visibility_status`
Indexes: `cases_hospital_status_priority`, `cases_patient_created`
Unique constraints: none

---

#### `case_artifacts`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| case_id | integer | no | none | no | cases.id |
| hospital_id | integer | no | none | no | hospitals.id |
| patient_id | integer | no | none | no | users.id |
| uploaded_by_user_id | integer | no | none | no | users.id |
| uploaded_by_membership_id | integer | yes | none | no | hospital_memberships.id |
| artifact_type | text enum (`scan_image`,`pathology_image`,`lab_pdf`,`prescription_image`,`report_pdf`,`other`) | no | none | no | none |
| processing_pipeline | text enum (`ml_scan`,`ocr_doc`,`none`) | no | `none` | no | none |
| file_url | text | no | none | no | none |
| thumbnail_url | text | yes | none | no | none |
| mime_type | text | yes | none | no | none |
| original_filename | text | yes | none | no | none |
| size_bytes | integer | yes | none | no | none |
| modality_hint | text | yes | none | no | none |
| status | text enum (`uploaded`,`processing`,`processed`,`failed`) | no | `uploaded` | no | none |
| processing_result_json | text | yes | none | no | none |
| patient_visible | integer (boolean) | no | false | no | none |
| created_at | integer (timestamp) | no | `$defaultFn(() => new Date())` | no | none |

Enums used in this table: `artifact_type`, `processing_pipeline`, `status`
Indexes: `ca_case_status`, `ca_case_type`
Unique constraints: none

---

#### `case_assignments`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| case_id | integer | no | none | no | cases.id |
| assigned_to_membership_id | integer | no | none | no | hospital_memberships.id |
| assigned_by_user_id | integer | no | none | no | users.id |
| specialty_id | integer | yes | none | no | specialties.id |
| assignment_type | text enum (`primary`,`consult`,`review`) | no | `primary` | no | none |
| reason | text | yes | none | no | none |
| status | text enum (`pending`,`accepted`,`completed`,`reassigned`) | no | `pending` | no | none |
| due_at | integer (timestamp) | yes | none | no | none |
| created_at | integer (timestamp) | no | `$defaultFn(() => new Date())` | no | none |
| accepted_at | integer (timestamp) | yes | none | no | none |
| completed_at | integer (timestamp) | yes | none | no | none |

Enums used in this table: `assignment_type`, `status`
Indexes: `cas_member_status`
Unique constraints: `cas_case_member_type` on (`case_id`,`assigned_to_membership_id`,`assignment_type`)

---

#### `care_teams`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| hospital_id | integer | no | none | no | hospitals.id |
| patient_id | integer | no | none | no | users.id |
| name | text | yes | none | no | none |
| is_active | integer (boolean) | no | true | no | none |
| created_at | integer (timestamp) | no | `$defaultFn(() => new Date())` | no | none |

Enums used in this table: none
Indexes: none
Unique constraints: none

---

#### `care_team_members`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| care_team_id | integer | no | none | no | care_teams.id |
| membership_id | integer | no | none | no | hospital_memberships.id |
| team_role | text enum (`primary_doctor`,`consultant`,`pathologist`) | no | none | no | none |
| is_primary | integer (boolean) | no | false | no | none |
| created_at | integer (timestamp) | no | `$defaultFn(() => new Date())` | no | none |

Enums used in this table: `team_role`
Indexes: none
Unique constraints: none

---

#### `hospital_report_templates`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| hospital_id | integer | no | none | no | hospitals.id |
| name | text | no | none | no | none |
| version | integer | no | 1 | no | none |
| is_default | integer (boolean) | no | false | no | none |
| is_active | integer (boolean) | no | true | no | none |
| header_image_url | text | yes | none | no | none |
| footer_image_url | text | yes | none | no | none |
| logo_url | text | yes | none | no | none |
| section_schema_json | text | yes | none | no | none |
| disclaimer_text | text | yes | none | no | none |
| signature_config_json | text | yes | none | no | none |
| created_at | integer (timestamp) | no | `$defaultFn(() => new Date())` | no | none |
| updated_at | integer (timestamp) | no | `$defaultFn(() => new Date())` | no | none |

Enums used in this table: none
Indexes: none
Unique constraints: `hrt_hospital_name_version` on (`hospital_id`,`name`,`version`)

---

#### `case_reports`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| case_id | integer | no | none | no | cases.id |
| hospital_id | integer | no | none | no | hospitals.id |
| template_id | integer | yes | none | no | hospital_report_templates.id |
| authored_by_user_id | integer | no | none | no | users.id |
| authored_by_membership_id | integer | yes | none | no | hospital_memberships.id |
| status | text enum (`draft`,`signed`,`released`,`archived`) | no | `draft` | no | none |
| title | text | yes | none | no | none |
| content_json | text | yes | none | no | none |
| html_snapshot | text | yes | none | no | none |
| pdf_url | text | yes | none | no | none |
| patient_summary | text | yes | none | no | none |
| released_medications_json | text | yes | none | no | none |
| signed_at | integer (timestamp) | yes | none | no | none |
| released_at | integer (timestamp) | yes | none | no | none |
| created_at | integer (timestamp) | no | `$defaultFn(() => new Date())` | no | none |
| updated_at | integer (timestamp) | no | `$defaultFn(() => new Date())` | no | none |

Enums used in this table: `status`
Indexes: `cr_case_status`
Unique constraints: none

---

#### `case_report_versions`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| id | integer | no | none | yes | none |
| report_id | integer | no | none | no | case_reports.id |
| version_number | integer | no | none | no | none |
| edited_by_user_id | integer | no | none | no | users.id |
| edited_by_membership_id | integer | yes | none | no | hospital_memberships.id |
| content_json | text | yes | none | no | none |
| html_snapshot | text | yes | none | no | none |
| change_summary | text | yes | none | no | none |
| created_at | integer (timestamp) | no | `$defaultFn(() => new Date())` | no | none |

Enums used in this table: none
Indexes: none
Unique constraints: `crv_report_version` on (`report_id`,`version_number`)

---

### Enums

#### `users.role`
Values: `patient`, `doctor`, `admin`, `pathologist`, `hospital_admin`

#### `scans.modality`
Values: `brain`, `lung`, `skin`, `ecg`

#### `scans.status`
Values: `pending`, `processing`, `completed`, `rejected`

#### `scans.priority`
Values: `low`, `medium`, `high`, `critical`

#### `reports.severity`
Values: `low`, `moderate`, `high`, `critical`

#### `reports.status`
Values: `draft`, `signed`

#### `messages.type`
Values: `text`, `scan`, `report`

#### `appointments.type`
Values: `initial`, `follow_up`, `emergency`, `review`

#### `appointments.status`
Values: `scheduled`, `confirmed`, `completed`, `cancelled`

#### `notifications.type`
Values: `scan_ready`, `report_signed`, `urgent_alert`, `message_received`, `appointment`, `appointment_scheduled`, `scan_completed`, `case_assigned`

#### `follow_ups.type`
Values: `email`, `call`

#### `follow_ups.status`
Values: `pending`, `sent`, `failed`, `cancelled`

#### `medications.added_by`
Values: `ocr`, `doctor`, `patient`

#### `medication_logs.status`
Values: `taken`, `missed`, `skipped`

#### `exercise_routines.type`
Values: `cardio`, `strength`, `flexibility`, `physio`, `yoga`, `walking`, `other`

#### `exercise_routines.added_by`
Values: `doctor`, `patient`

#### `exercise_logs.status`
Values: `completed`, `partial`, `skipped`

#### `api_keys.environment`
Values: `test`, `live`

#### `hospitals.type`
Values: `hospital`, `clinic`, `diagnostic_center`, `lab`

#### `hospital_memberships.membership_role`
Values: `doctor`, `pathologist`, `hospital_admin`

#### `hospital_memberships.status`
Values: `pending`, `active`, `inactive`, `rejected`

#### `patient_hospital_links.status`
Values: `active`, `inactive`, `discharged`

#### `cases.source_role`
Values: `doctor`, `pathologist`, `patient`, `system`

#### `cases.status`
Values: `new`, `triaged`, `assigned`, `in_review`, `signed`, `released`, `closed`

#### `cases.priority`
Values: `low`, `medium`, `high`, `critical`

#### `cases.patient_visibility_status`
Values: `hidden`, `released`

#### `case_artifacts.artifact_type`
Values: `scan_image`, `pathology_image`, `lab_pdf`, `prescription_image`, `report_pdf`, `other`

#### `case_artifacts.processing_pipeline`
Values: `ml_scan`, `ocr_doc`, `none`

#### `case_artifacts.status`
Values: `uploaded`, `processing`, `processed`, `failed`

#### `case_assignments.assignment_type`
Values: `primary`, `consult`, `review`

#### `case_assignments.status`
Values: `pending`, `accepted`, `completed`, `reassigned`

#### `care_team_members.team_role`
Values: `primary_doctor`, `consultant`, `pathologist`

#### `case_reports.status`
Values: `draft`, `signed`, `released`, `archived`

---

### Relations Map

List every foreign key relation in one place for quick reference.

| From table | From column | To table | To column | Relation type |
|------------|-------------|----------|-----------|---------------|
| doctor_profiles | user_id | users | id | many-to-one |
| scans | patient_id | users | id | many-to-one |
| scans | doctor_id | users | id | many-to-one |
| reports | scan_id | scans | id | many-to-one |
| reports | patient_id | users | id | many-to-one |
| reports | doctor_id | users | id | many-to-one |
| reports | template_id | templates | id | many-to-one |
| conversations | patient_id | users | id | many-to-one |
| conversations | doctor_id | users | id | many-to-one |
| messages | conversation_id | conversations | id | many-to-one |
| messages | sender_id | users | id | many-to-one |
| appointments | patient_id | users | id | many-to-one |
| appointments | doctor_id | users | id | many-to-one |
| notifications | user_id | users | id | many-to-one |
| family_members | patient_id | users | id | many-to-one |
| follow_ups | scan_id | scans | id | many-to-one |
| follow_ups | patient_id | users | id | many-to-one |
| voice_notes | scan_id | scans | id | many-to-one |
| prescriptions | patient_id | users | id | many-to-one |
| medications | patient_id | users | id | many-to-one |
| medications | prescription_id | prescriptions | id | many-to-one |
| medications | doctor_id | users | id | many-to-one |
| medication_logs | medication_id | medications | id | many-to-one |
| medication_logs | patient_id | users | id | many-to-one |
| exercise_routines | patient_id | users | id | many-to-one |
| exercise_routines | doctor_id | users | id | many-to-one |
| exercise_logs | routine_id | exercise_routines | id | many-to-one |
| exercise_logs | patient_id | users | id | many-to-one |
| api_keys | user_id | users | id | many-to-one |
| departments | hospital_id | hospitals | id | many-to-one |
| hospital_memberships | user_id | users | id | many-to-one |
| hospital_memberships | hospital_id | hospitals | id | many-to-one |
| hospital_memberships | department_id | departments | id | many-to-one |
| hospital_memberships | specialty_id | specialties | id | many-to-one |
| patient_hospital_links | patient_id | users | id | many-to-one |
| patient_hospital_links | hospital_id | hospitals | id | many-to-one |
| patient_hospital_links | primary_doctor_membership_id | hospital_memberships | id | many-to-one |
| cases | hospital_id | hospitals | id | many-to-one |
| cases | patient_id | users | id | many-to-one |
| cases | created_by_user_id | users | id | many-to-one |
| cases | created_by_membership_id | hospital_memberships | id | many-to-one |
| cases | primary_specialty_id | specialties | id | many-to-one |
| cases | primary_doctor_membership_id | hospital_memberships | id | many-to-one |
| case_artifacts | case_id | cases | id | many-to-one |
| case_artifacts | hospital_id | hospitals | id | many-to-one |
| case_artifacts | patient_id | users | id | many-to-one |
| case_artifacts | uploaded_by_user_id | users | id | many-to-one |
| case_artifacts | uploaded_by_membership_id | hospital_memberships | id | many-to-one |
| case_assignments | case_id | cases | id | many-to-one |
| case_assignments | assigned_to_membership_id | hospital_memberships | id | many-to-one |
| case_assignments | assigned_by_user_id | users | id | many-to-one |
| case_assignments | specialty_id | specialties | id | many-to-one |
| care_teams | hospital_id | hospitals | id | many-to-one |
| care_teams | patient_id | users | id | many-to-one |
| care_team_members | care_team_id | care_teams | id | many-to-one |
| care_team_members | membership_id | hospital_memberships | id | many-to-one |
| hospital_report_templates | hospital_id | hospitals | id | many-to-one |
| case_reports | case_id | cases | id | many-to-one |
| case_reports | hospital_id | hospitals | id | many-to-one |
| case_reports | template_id | hospital_report_templates | id | many-to-one |
| case_reports | authored_by_user_id | users | id | many-to-one |
| case_reports | authored_by_membership_id | hospital_memberships | id | many-to-one |
| case_report_versions | report_id | case_reports | id | many-to-one |
| case_report_versions | edited_by_user_id | users | id | many-to-one |
| case_report_versions | edited_by_membership_id | hospital_memberships | id | many-to-one |

---

### API Route → Table Usage

| Route | Method | Tables Read | Tables Written | Notes |
|-------|--------|-------------|----------------|-------|
| /api/ai/report | POST | templates | none | reads template structure only |
| /api/ai/suggest | POST | none | none | no DB access |
| /api/ai/treatment | POST | none | none | no DB access |
| /api/analytics | GET | users, scans, reports, appointments, conversations, messages | none | analytics aggregates |
| /api/appointments | GET | users, appointments | none | role-based listing |
| /api/appointments | POST | users | appointments, notifications | writes appointment and notification |
| /api/appointments | PATCH | users | appointments | updates status |
| /api/artifacts/upload | POST | cases | case_artifacts | async processing updates status/result |
| /api/call-reminder | POST | none | none | no DB access |
| /api/cases | GET | users, cases, case_assignments | none | role/hospital scoped |
| /api/cases | POST | hospital_memberships (optional), users (auth context) | cases, case_assignments, notifications | may auto-assign doctor |
| /api/cases/[id] | GET | cases, hospital_memberships | none | role-aware detail |
| /api/cases/[id] | PATCH | cases | cases | updates status/priority/summary/title |
| /api/cases/[id]/artifacts | GET | cases, case_artifacts | none | patient view filtered by patient_visible |
| /api/cases/[id]/artifacts | POST | cases | case_artifacts | registers uploaded artifact |
| /api/cases/[id]/assignments | GET | cases, case_assignments, hospital_memberships | none | assignment list |
| /api/cases/[id]/assignments | POST | cases, hospital_memberships | case_assignments, cases, notifications | create assignment |
| /api/cases/[id]/assignments | PATCH | case_assignments | case_assignments, cases | accept/complete assignment |
| /api/cases/[id]/reports | GET | cases, case_reports | none | report list |
| /api/cases/[id]/reports | POST | cases | case_reports, case_report_versions | create report draft/version |
| /api/cases/[id]/reports | PATCH | cases, case_reports, case_report_versions | case_reports, case_report_versions, cases, case_artifacts | sign/release flow |
| /api/conversations | GET | users, conversations, messages | none | listing with snippets |
| /api/conversations | POST | users, conversations | conversations | create/find conversation |
| /api/conversations/[id]/messages | GET | messages | none | thread messages |
| /api/conversations/[id]/messages | POST | users, conversations | messages, conversations, notifications | send message |
| /api/developer/keys | GET | users, api_keys | none | list keys |
| /api/developer/keys | POST | users, api_keys | api_keys | create key |
| /api/developer/keys | DELETE | users | api_keys | revoke key |
| /api/doctor/patients/[id] | GET | users, scans, reports, appointments | none | doctor patient detail |
| /api/doctor/profile | GET | users, doctor_profiles | none | profile fetch |
| /api/doctor/profile | PUT | users, doctor_profiles | doctor_profiles | upsert profile |
| /api/doctor/stats | GET | users, scans | none | doctor dashboard stats |
| /api/exercises | GET | users, exercise_routines, exercise_logs | none | routines + logs |
| /api/exercises | POST | users | exercise_routines | create routine |
| /api/exercises/[id] | PATCH | users | exercise_routines | update routine |
| /api/exercises/[id] | DELETE | users | exercise_routines | delete routine |
| /api/exercises/log | POST | users, exercise_logs | exercise_logs | upsert daily log |
| /api/family | GET | users, family_members | none | list family |
| /api/family | POST | users | family_members | add family member |
| /api/family | DELETE | users | family_members | delete family member |
| /api/hospitals | GET | hospitals | none | list active hospitals |
| /api/hospitals/[id]/patients | GET | hospitals, patient_hospital_links, users | none | hospital patient search |
| /api/medications | GET | users, medications, medication_logs | none | meds + today's logs |
| /api/medications | POST | users | medications | add medication |
| /api/medications/[id] | PATCH | users | medications | update medication |
| /api/medications/[id] | DELETE | users | medications | delete medication |
| /api/medications/log | POST | users, medication_logs | medication_logs | upsert medication log |
| /api/memberships | GET | hospital_memberships, hospitals, specialties | none | memberships listing |
| /api/memberships | POST | users | hospital_memberships | create membership |
| /api/memberships | PATCH | hospital_memberships | hospital_memberships | primary toggle |
| /api/ml-proxy | POST | none | none | no DB access |
| /api/notifications | GET | users, notifications | none | list notifications |
| /api/notifications | PATCH | users | notifications | mark read |
| /api/ocr | POST | users | none | ML proxy only |
| /api/ocr/save | POST | users | prescriptions, medications | save OCR extract |
| /api/patients/hospitals | GET | users, patient_hospital_links, hospitals | none | patient linked hospitals |
| /api/report-templates | GET | hospital_report_templates | none | list templates |
| /api/report-templates | POST | hospital_report_templates | hospital_report_templates | create template |
| /api/reports | GET | users, reports | none | list reports |
| /api/reports | POST | users, scans | reports, scans | create report and mark scan completed |
| /api/reports/[id] | GET | users, reports | none | report detail |
| /api/research | POST | none | none | no DB access |
| /api/research/stats | GET | none | none | no DB access |
| /api/scans | GET | users, scans | none | list scans |
| /api/scans/[id] | GET | users, scans | none | scan detail |
| /api/scans/[id] | PATCH | users | scans | review/update scan |
| /api/schedule-followup | POST | scans, users | follow_ups | schedule follow-up |
| /api/schedule-followup | GET | follow_ups, users | follow_ups | process due follow-ups |
| /api/send-report-email | POST | users, scans | none | send email; no DB write |
| /api/twiml-confirm | POST | none | none | no DB access |
| /api/twiml-reminder | POST | none | none | no DB access |
| /api/upload | POST | users | scans, notifications | upload + inference + notifications |
| /api/users/me | GET | users | none | current user |
| /api/users/onboard | POST | users | users | set role/onboarded |
| /api/users/patients | GET | users | none | doctor patient list |
| /api/users/patients | POST | users | users | create patient |
| /api/users/sync | POST | users | users | sync clerk user |
| /api/voice-notes | POST | scans | voice_notes | save transcription |

---

### Schema Gaps Found

Fields written by API routes that do not exist in the schema:

| Route | Field | Issue |
|-------|-------|-------|
| none | none | none |

Fields in schema never read or written by any route:

| Table | Column | Note |
|-------|--------|------|
| users | hospital_id | exists in schema, unused in all routes |
| users | specialty | exists in schema, unused in all routes |
| doctor_profiles | specialty_id | exists in schema, unused in all routes |
| scans | hospital_id | exists in schema, unused in all routes |
| scans | case_id | exists in schema, unused in all routes |
| scans | source_artifact_id | exists in schema, unused in all routes |
| reports | case_id | exists in schema, unused in all routes |
| conversations | hospital_id | exists in schema, unused in all routes |
| appointments | hospital_id | exists in schema, unused in all routes |
| prescriptions | hospital_id | exists in schema, unused in all routes |
| prescriptions | case_id | exists in schema, unused in all routes |
| prescriptions | source_artifact_id | exists in schema, unused in all routes |
| departments | all columns | exists in schema, unused in all routes |
| specialties | all columns | exists in schema, unused in all routes |
| care_teams | all columns | exists in schema, unused in all routes |
| care_team_members | all columns | exists in schema, unused in all routes |

---

### Files Inspected

| File | Status |
|------|--------|
| lib/db/schema.ts | found |
| lib/db/index.ts | found |
| drizzle.config.ts | found |
| drizzle/*.sql | found 1 files |
| scripts/seed.ts | found |
| app/api/**/route.ts | found 50 files |
| backend/core/database.py | not found |
| backend/models/schema.py | not found |
| backend/routers/*.py | found 0 files / not found |

---

### Notes

- `drizzle/0000_sour_logan.sql` is older and does not reflect the current full schema in `lib/db/schema.ts`.
- Current source of truth for DB structure is `lib/db/schema.ts`.
- Additional DB query helper discovered: `lib/api-auth.ts` (reads users, hospital_memberships, hospitals, specialties).
