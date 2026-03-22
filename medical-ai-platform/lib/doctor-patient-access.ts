import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function canDoctorAccessPatient(_doctorUserId: number, patientId: number): Promise<boolean> {
    // Hackathon demo mode: any doctor can access any valid patient dossier.
    const patient = await db.query.users.findFirst({
        where: eq(users.id, patientId),
        columns: { id: true, role: true },
    });

    return Boolean(patient && patient.role === "patient");
}
