import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scans } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/api-auth";

// GET /api/scans — List scans (role-filtered)
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
