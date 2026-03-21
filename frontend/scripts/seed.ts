import { db } from "../lib/db";
import { users, doctorProfiles, scans, appointments, templates, conversations, messages, notifications, reports } from "../lib/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function main() {
    console.log("🌱 Starting seed...");

    // 1. Ensure directories exist
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const heatmapDir = path.join(process.cwd(), "public", "heatmaps");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    if (!fs.existsSync(heatmapDir)) fs.mkdirSync(heatmapDir, { recursive: true });

    // 2. Copy demo images
    const rootDir = process.cwd();
    const demoImages = [
        "a509797a678f8e_CHF-1c1.jpg",
        "a50e99d430f376_4-hemorrhage-post-biopsy.jpg",
        "a50e9a812aaaab_6-diffuse-legionella.jpg",
        "a50e9a848bc956_5a-NHL.jpg",
        "a50e9a87e65d1c_5b-NHL.jpg",
        "a50e9d58ded69a_8-Longinfarct.jpg"
    ];

    for (const img of demoImages) {
        const src = path.join(rootDir, img);
        const dest = path.join(uploadDir, img);
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
        }
    }

    // 3. Find or note existing doctor
    let doctor = await db.query.users.findFirst({ where: eq(users.role, "doctor") });

    if (!doctor) {
        console.log("ℹ️ No doctor user found. Sign up as a doctor first, then re-run seed.");
    } else {
        const existingProfile = await db.query.doctorProfiles.findFirst({
            where: eq(doctorProfiles.userId, doctor.id)
        });
        if (!existingProfile) {
            await db.insert(doctorProfiles).values({
                userId: doctor.id,
                specialty: "Pulmonology & Radiology",
                degree: "MBBS, MD Radiology",
                experience: 12,
                licenseNumber: "MED-2024-8892",
                rating: 4.8,
                totalConsultations: 856,
                totalScansReviewed: 1240
            });
            console.log("👨‍⚕️ Created profile for Dr. " + doctor.name);
        }
    }

    // 4. Create 5 Patients with detailed profiles
    const patientsData = [
        {
            name: "Kawaljeet Singh", email: "kawaljeet@example.com", clerkId: "mock_kawaljeet",
            role: "patient" as const, age: 45, gender: "Male", bloodType: "O+",
            medicalHistory: "Type 2 Diabetes (10 years), Hypertension, Previous MI (2019)",
            phone: "+91-9876543210"
        },
        {
            name: "Akshat Sharma", email: "akshat@example.com", clerkId: "mock_akshat",
            role: "patient" as const, age: 32, gender: "Male", bloodType: "B+",
            medicalHistory: "Hypertension, Family history of stroke, Migraine",
            phone: "+91-9876543211"
        },
        {
            name: "Priya Mehta", email: "priya@example.com", clerkId: "mock_priya",
            role: "patient" as const, age: 28, gender: "Female", bloodType: "A+",
            medicalHistory: "Asthma (childhood), Allergic dermatitis",
            phone: "+91-9876543212"
        },
        {
            name: "Rahul Verma", email: "rahul@example.com", clerkId: "mock_rahul",
            role: "patient" as const, age: 67, gender: "Male", bloodType: "AB-",
            medicalHistory: "Arthritis, COPD, Previous knee replacement (2020), Smoker (40 years)",
            phone: "+91-9876543213"
        },
        {
            name: "Sneha Patel", email: "sneha@example.com", clerkId: "mock_sneha",
            role: "patient" as const, age: 39, gender: "Female", bloodType: "O-",
            medicalHistory: "Obesity (BMI 32), PCOS, Gestational diabetes (2018), Pregnant (28 weeks)",
            phone: "+91-9876543214"
        },
    ];

    const createdPatients: any[] = [];
    for (const p of patientsData) {
        let patient = await db.query.users.findFirst({ where: eq(users.email, p.email) });
        if (!patient) {
            const [newPatient] = await db.insert(users).values({
                ...p, isOnboarded: true
            }).returning();
            patient = newPatient;
            console.log(`👤 Created patient: ${p.name} (${p.age}${p.gender[0]}, ${p.bloodType})`);
        } else {
            // Update with profile data if missing
            await db.update(users).set({
                age: p.age, gender: p.gender, bloodType: p.bloodType,
                medicalHistory: p.medicalHistory, phone: p.phone
            }).where(eq(users.id, patient.id));
        }
        createdPatients.push(patient);
    }

    // 5. Create 10 Scans
    const scansData = [
        {
            patientId: createdPatients[0].id, modality: "lung", status: "pending", priority: "critical",
            symptoms: "Severe chest pain radiating to left arm, coughing blood, shortness of breath at rest",
            imageUrl: "/uploads/a509797a678f8e_CHF-1c1.jpg", aiDiagnosis: null,
            aiConfidence: null, aiUncertainty: null, triageScore: null,
            uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 2)
        },
        {
            patientId: createdPatients[0].id, modality: "lung", status: "completed", priority: "high",
            symptoms: "Follow-up after antibiotic course, still wheezing",
            imageUrl: "/uploads/a50e9a812aaaab_6-diffuse-legionella.jpg", aiDiagnosis: null,
            aiConfidence: null, aiUncertainty: null, triageScore: null,
            uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5)
        },
        {
            patientId: createdPatients[1].id, modality: "lung", status: "pending", priority: "high",
            symptoms: "Persistent headache for 3 weeks, cough with hemoptysis, dizziness",
            imageUrl: "/uploads/a50e99d430f376_4-hemorrhage-post-biopsy.jpg", aiDiagnosis: null,
            aiConfidence: null, aiUncertainty: null, triageScore: null,
            uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 5)
        },
        {
            patientId: createdPatients[1].id, modality: "lung", status: "pending", priority: "medium",
            symptoms: "Mild chest pain, occasional vertigo, dry cough",
            imageUrl: "/uploads/a50e9d58ded69a_8-Longinfarct.jpg", aiDiagnosis: null,
            aiConfidence: null, aiUncertainty: null, triageScore: null,
            uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24)
        },
        {
            patientId: createdPatients[2].id, modality: "lung", status: "pending", priority: "medium",
            symptoms: "Chronic cough for 3 months, night sweats, mild weight loss",
            imageUrl: "/uploads/a50e9a848bc956_5a-NHL.jpg", aiDiagnosis: null,
            aiConfidence: null, aiUncertainty: null, triageScore: null,
            uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 3)
        },
        {
            patientId: createdPatients[2].id, modality: "lung", status: "completed", priority: "low",
            symptoms: "Routine chest X-ray for annual screening",
            imageUrl: "/uploads/a50e9a87e65d1c_5b-NHL.jpg", aiDiagnosis: null,
            aiConfidence: null, aiUncertainty: null, triageScore: null,
            uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10)
        },
        {
            patientId: createdPatients[3].id, modality: "lung", status: "pending", priority: "critical",
            symptoms: "COPD exacerbation, can't walk 10 meters without gasping, SpO2 88%",
            imageUrl: "/uploads/a509797a678f8e_CHF-1c1.jpg", aiDiagnosis: null,
            aiConfidence: null, aiUncertainty: null, triageScore: null,
            uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 1)
        },
        {
            patientId: createdPatients[3].id, modality: "lung", status: "completed", priority: "high",
            symptoms: "Irregular heartbeat, chest tightness, palpitations during night, chronic cough",
            imageUrl: "/uploads/a50e9d58ded69a_8-Longinfarct.jpg", aiDiagnosis: null,
            aiConfidence: null, aiUncertainty: null, triageScore: null,
            uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
            doctorNotes: "Chest X-ray shows possible infiltrates. Continue current medication. Schedule follow-up."
        },
        {
            patientId: createdPatients[4].id, modality: "lung", status: "pending", priority: "medium",
            symptoms: "Pregnancy-related shortness of breath, persistent cough, BP 150/95",
            imageUrl: "/uploads/a50e99d430f376_4-hemorrhage-post-biopsy.jpg", aiDiagnosis: null,
            aiConfidence: null, aiUncertainty: null, triageScore: null,
            uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 4)
        },
        {
            patientId: createdPatients[4].id, modality: "lung", status: "completed", priority: "low",
            symptoms: "Mild chest discomfort, cough during pregnancy",
            imageUrl: "/uploads/a50e9a87e65d1c_5b-NHL.jpg", aiDiagnosis: null,
            aiConfidence: null, aiUncertainty: null, triageScore: null,
            uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
            doctorNotes: "Chest X-ray appears normal. Monitor respiratory symptoms during pregnancy."
        },
    ];

    const createdScans: any[] = [];
    for (const s of scansData) {
        const existing = await db.query.scans.findFirst({
            where: (scans, { and, eq }) => and(eq(scans.imageUrl, s.imageUrl), eq(scans.patientId, s.patientId))
        });
        if (!existing) {
            const [newScan] = await db.insert(scans).values(s as any).returning();
            createdScans.push(newScan);
            console.log(`📷 Added ${s.priority} ${s.modality} scan: ${s.aiDiagnosis}`);
        } else {
            createdScans.push(existing);
        }
    }

    // 6. Create Reports for completed scans
    if (doctor) {
        const completedScans = createdScans.filter((s: any) => s.status === "completed");
        for (const cs of completedScans) {
            const existingReport = await db.query.reports.findFirst({
                where: eq(reports.scanId, cs.id)
            });
            if (!existingReport) {
                await db.insert(reports).values({
                    scanId: cs.id,
                    patientId: cs.patientId,
                    doctorId: doctor.id,
                    diagnosis: cs.aiDiagnosis || "See findings",
                    findings: `AI-assisted analysis identified ${cs.aiDiagnosis} with ${((cs.aiConfidence || 0) * 100).toFixed(1)}% confidence.\n\nThe ${cs.modality} scan was processed using VaidyaVision's expert neural network with GradCAM visualization.\n\nKey observations:\n- Primary finding consistent with ${cs.aiDiagnosis}\n- Model uncertainty: ${((cs.aiUncertainty || 0) * 100).toFixed(1)}%\n- Triage priority score: ${cs.triageScore || 'N/A'}/100\n\nClinical correlation with patient history is recommended.`,
                    recommendations: `1. Follow up in 2-4 weeks with repeat imaging\n2. Continue current treatment protocol\n3. Monitor symptoms and report any changes\n4. Schedule appointment for detailed consultation`,
                    severity: cs.priority === "critical" ? "critical" : cs.priority === "high" ? "high" : "moderate",
                    status: "signed",
                });
                console.log(`📄 Created report for scan #${cs.id} (${cs.aiDiagnosis})`);
            }
        }

        // 7. Create Appointments
        const now = new Date();
        const appointmentsData = [
            {
                patientId: createdPatients[0].id, doctorId: doctor.id,
                scheduledAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0),
                type: "follow_up" as const, notes: "Post-pneumonia follow-up, check lung X-ray", status: "confirmed" as const
            },
            {
                patientId: createdPatients[1].id, doctorId: doctor.id,
                scheduledAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 30),
                type: "review" as const, notes: "Chest X-ray review - discuss pulmonary findings", status: "scheduled" as const
            },
            {
                patientId: createdPatients[3].id, doctorId: doctor.id,
                scheduledAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0),
                type: "emergency" as const, notes: "COPD exacerbation - urgent consult", status: "confirmed" as const
            },
            {
                patientId: createdPatients[4].id, doctorId: doctor.id,
                scheduledAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 30),
                type: "initial" as const, notes: "Pregnancy headache evaluation, rule out preeclampsia", status: "scheduled" as const
            },
            {
                patientId: createdPatients[2].id, doctorId: doctor.id,
                scheduledAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0),
                type: "review" as const, notes: "Chest X-ray follow-up - respiratory review", status: "scheduled" as const
            },
            {
                patientId: createdPatients[0].id, doctorId: doctor.id,
                scheduledAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 10, 30),
                type: "follow_up" as const, notes: "Diabetes management check + lung clearance", status: "scheduled" as const
            },
            {
                patientId: createdPatients[3].id, doctorId: doctor.id,
                scheduledAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 11, 0),
                type: "follow_up" as const, notes: "COPD follow-up + lung imaging review", status: "scheduled" as const
            },
            {
                patientId: createdPatients[2].id, doctorId: doctor.id,
                scheduledAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5, 14, 0),
                type: "initial" as const, notes: "Initial chest screening consultation", status: "completed" as const
            },
        ];

        for (const apt of appointmentsData) {
            const existingApt = await db.query.appointments.findFirst({
                where: (appointments, { and, eq }) => and(
                    eq(appointments.patientId, apt.patientId),
                    eq(appointments.scheduledAt, apt.scheduledAt)
                )
            });
            if (!existingApt) {
                await db.insert(appointments).values(apt);
                console.log(`📅 Created ${apt.type} appointment at ${apt.scheduledAt.toLocaleTimeString()}`);
            }
        }

        // 8. Create Conversations & Messages
        for (const patient of createdPatients.slice(0, 3)) {
            let conv = await db.query.conversations.findFirst({
                where: (convs, { and, eq: e }) => and(
                    e(convs.patientId, patient.id),
                    e(convs.doctorId, doctor!.id)
                )
            });
            if (!conv) {
                const [newConv] = await db.insert(conversations).values({
                    patientId: patient.id,
                    doctorId: doctor!.id,
                    lastMessageAt: new Date(),
                }).returning();
                conv = newConv;

                const msgs = [
                    { senderId: patient.id, content: `Hello Doctor, I have some concerns about my recent scan results.` },
                    { senderId: doctor!.id, content: `Hello ${patient.name}! I've reviewed your scan. Let me explain the findings.` },
                    { senderId: patient.id, content: `Thank you, Doctor. Should I be worried? What are the next steps?` },
                    { senderId: doctor!.id, content: `Let's schedule a follow-up to discuss the treatment plan in detail. Continue your current medications.` },
                ];

                for (let i = 0; i < msgs.length; i++) {
                    await db.insert(messages).values({
                        conversationId: conv.id,
                        senderId: msgs[i].senderId,
                        content: msgs[i].content,
                        type: "text",
                        createdAt: new Date(Date.now() - (msgs.length - i) * 1800000),
                    });
                }
                console.log(`💬 Created conversation with ${patient.name}`);
            }
        }

        // 9. Create notifications
        const existingNotifs = await db.query.notifications.findFirst({
            where: eq(notifications.userId, doctor.id)
        });
        if (!existingNotifs) {
            await db.insert(notifications).values([
                {
                    userId: doctor.id, type: "scan_ready" as const,
                    message: "New CRITICAL lung scan from Kawaljeet Singh. Immediate review recommended.",
                    link: `/doctor/scan/${createdScans[0]?.id || 1}`, isRead: false,
                },
                {
                    userId: doctor.id, type: "urgent_alert" as const,
                    message: "Rahul Verma COPD scan - critical findings (triage: 90). Priority review.",
                    link: `/doctor/scan/${createdScans[6]?.id || 7}`, isRead: false,
                },
                {
                    userId: doctor.id, type: "appointment_scheduled" as const,
                    message: "New appointment with Sneha Patel for pregnancy headache evaluation.",
                    link: "/doctor/appointments", isRead: false,
                },
                {
                    userId: doctor.id, type: "message_received" as const,
                    message: "New message from Kawaljeet Singh regarding scan results.",
                    link: "/doctor/messages", isRead: true,
                },
            ]);
            console.log("🔔 Created doctor notifications");
        }
    }

    // 10. Seed Report Templates
    const reportTemplates = [
        {
            name: "Brain MRI Report", language: "en",
            structureJson: JSON.stringify({
                title: "Brain MRI Diagnostic Report",
                sections: [
                    { heading: "Clinical History", placeholder: "Patient presented with..." },
                    { heading: "Technique", placeholder: "MRI with T1, T2, FLAIR, DWI and post-contrast T1WI." },
                    { heading: "Findings", placeholder: "Describe findings..." },
                    { heading: "Impression", placeholder: "1. Primary diagnosis\n2. Differential considerations" },
                    { heading: "Recommendations", placeholder: "Follow-up recommendations..." }
                ]
            }),
        },
        {
            name: "Chest X-Ray / Lung Report", language: "en",
            structureJson: JSON.stringify({
                title: "Chest Radiograph Diagnostic Report",
                sections: [
                    { heading: "Clinical Indication", placeholder: "Reason for examination..." },
                    { heading: "Technique", placeholder: "PA and lateral chest radiograph." },
                    { heading: "Findings", placeholder: "Heart, mediastinum, lungs, pleural spaces..." },
                    { heading: "Impression", placeholder: "1. Primary finding\n2. Additional observations" },
                    { heading: "Recommendations", placeholder: "Recommended follow-up..." }
                ]
            }),
        },
        {
            name: "Skin Lesion Dermoscopy Report", language: "en",
            structureJson: JSON.stringify({
                title: "Dermatopathology / Dermoscopy Report",
                sections: [
                    { heading: "Clinical Information", placeholder: "Lesion location, size, duration..." },
                    { heading: "Dermoscopic Findings", placeholder: "Pattern, colors, structures..." },
                    { heading: "Diagnosis", placeholder: "Primary diagnosis..." },
                    { heading: "Management Plan", placeholder: "Excision, monitoring, follow-up..." }
                ]
            }),
        },
        {
            name: "ECG / Cardiology Report", language: "en",
            structureJson: JSON.stringify({
                title: "ECG Report",
                sections: [
                    { heading: "Clinical Indication", placeholder: "Reason for ECG..." },
                    { heading: "Rhythm Analysis", placeholder: "Rate, rhythm, axis, intervals..." },
                    { heading: "Interpretation", placeholder: "Primary findings..." },
                    { heading: "Clinical Correlation", placeholder: "Recommendations..." }
                ]
            }),
        },
        {
            name: "Brain MRI Report (Hindi)", language: "hi",
            structureJson: JSON.stringify({
                title: "ब्रेन एमआरआई रिपोर्ट",
                sections: [
                    { heading: "क्लिनिकल इतिहास", placeholder: "रोगी ने प्रस्तुत किया..." },
                    { heading: "निष्कर्ष", placeholder: "निष्कर्षों का वर्णन..." },
                    { heading: "सिफारिशें", placeholder: "अनुवर्ती सिफारिशें..." }
                ]
            }),
        },
        {
            name: "Chest X-Ray Report (Hindi)", language: "hi",
            structureJson: JSON.stringify({
                title: "छाती एक्स-रे रिपोर्ट",
                sections: [
                    { heading: "क्लिनिकल संकेत", placeholder: "परीक्षा का कारण..." },
                    { heading: "निष्कर्ष", placeholder: "हृदय, फेफड़े..." },
                    { heading: "सिफारिशें", placeholder: "अनुशंसित अनुवर्ती..." }
                ]
            }),
        },
    ];

    for (const t of reportTemplates) {
        const existing = await db.query.templates.findFirst({
            where: (templates, { and, eq }) => and(eq(templates.name, t.name), eq(templates.language, t.language))
        });
        if (!existing) {
            await db.insert(templates).values(t);
            console.log(`📝 Added template: ${t.name}`);
        }
    }

    console.log("\n✅ Seed completed!");
    console.log("   5 patients · 10 scans · Reports · 8 appointments · 3 conversations · 6 templates");
}

main().catch((err) => { console.error(err); process.exit(1); });
