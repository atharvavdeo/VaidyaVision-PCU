import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { scans, users } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

// GET /api/scans — List scans (role-filtered)
export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.clerkId, userId),
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const searchParams = req.nextUrl.searchParams;
        const status = searchParams.get("status");

        let scanList;

        if (user.role === "doctor") {
            // Doctors see all scans (could be filtered by assigned)
            if (status) {
                scanList = await db.query.scans.findMany({
                    where: eq(scans.status, status as any),
                    orderBy: [desc(scans.uploadedAt)],
                    with: { patient: true },
                });
            } else {
                scanList = await db.query.scans.findMany({
                    orderBy: [desc(scans.uploadedAt)],
                    with: { patient: true },
                });
            }
        } else {
            // Patients see only their own scans
            if (status) {
                scanList = await db.query.scans.findMany({
                    where: and(eq(scans.patientId, user.id), eq(scans.status, status as any)),
                    orderBy: [desc(scans.uploadedAt)],
                });
            } else {
                scanList = await db.query.scans.findMany({
                    where: eq(scans.patientId, user.id),
                    orderBy: [desc(scans.uploadedAt)],
                });
            }
        }

        return NextResponse.json({ scans: scanList });
    } catch (error) {
        console.error("[/api/scans] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
