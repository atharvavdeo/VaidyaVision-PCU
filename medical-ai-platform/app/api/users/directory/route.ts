import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

// GET /api/users/directory — Get a list of patients and doctors for dropdowns
export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const currentUser = await db.query.users.findFirst({
            where: eq(users.clerkId, userId),
        });

        if (!currentUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // If the current user is a doctor, they might want to book appointments with patients
        // If the current user is a patient, they might want to book appointments with doctors
        const targetRole = currentUser.role === "doctor" ? "patient" : "doctor";

        const directory = await db.query.users.findMany({
            where: inArray(users.role, currentUser.role === "admin" ? ["doctor", "patient"] : [targetRole]),
            columns: {
                id: true,
                name: true,
                role: true,
                imageUrl: true,
                specialty: true,
            },
        });

        return NextResponse.json({ users: directory });
    } catch (error) {
        console.error("[/api/users/directory] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
