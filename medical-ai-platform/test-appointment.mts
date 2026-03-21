import { db } from "./lib/db/index.js";
import { appointments, notifications, users } from "./lib/db/schema.js";

async function run() {
    try {
        console.log("Users in DB:");
        const allUsers = await db.select().from(users);
        console.log(allUsers.map(u => ({id: u.id, role: u.role, name: u.name})));
        
        if (allUsers.length < 2) {
            console.log("Need at least 2 users to test.");
            return;
        }

        const patientId = allUsers.find(u => u.role === "patient")?.id;
        const doctorId = allUsers.find(u => u.role === "doctor")?.id;

        if (!patientId || !doctorId) {
            console.log("Need a patient and a doctor in DB.");
            return;
        }

        console.log(`Trying to create appointment connecting P=${patientId} D=${doctorId}`);

        const [appt] = await db
            .insert(appointments)
            .values({
                patientId: patientId,
                doctorId: doctorId,
                scheduledAt: new Date("2026-03-22T10:00:00"),
                type: "follow_up",
                notes: "Test notes",
                status: "scheduled",
            })
            .returning();
        
        console.log("Created appointment:", appt);

        await db.insert(notifications).values({
            userId: doctorId,
            type: "appointment_scheduled",
            message: `New appointment scheduled by System`,
            link: "/doctor/appointments",
        });

        console.log("Test passed!");
    } catch (e) {
        console.error("Test failed:", e);
    }
}
run();
