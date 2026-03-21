import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { scans, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// PATCH /api/scans/[id] — Doctor: update scan (accept/reject, add notes)
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.clerkId, userId),
        });

        if (!user || user.role !== "doctor") {
            return NextResponse.json({ error: "Doctor access only" }, { status: 403 });
        }

        const scanId = parseInt(params.id);
        if (isNaN(scanId)) {
            return NextResponse.json({ error: "Invalid scan ID" }, { status: 400 });
        }

        const body = await req.json();
        const { status, doctorNotes, aiDiagnosis, aiConfidence, aiUncertainty, heatmapUrl, expertUsed, triageScore } = body;

        const updateData: Record<string, any> = {
            doctorId: user.id,
            reviewedAt: new Date(),
        };

        if (status) updateData.status = status;
        if (doctorNotes !== undefined) updateData.doctorNotes = doctorNotes;
        if (aiDiagnosis !== undefined) updateData.aiDiagnosis = aiDiagnosis;
        if (aiConfidence !== undefined) updateData.aiConfidence = aiConfidence;
        if (aiUncertainty !== undefined) updateData.aiUncertainty = aiUncertainty;
        if (heatmapUrl !== undefined) updateData.heatmapUrl = heatmapUrl;
        if (expertUsed !== undefined) updateData.expertUsed = expertUsed;
        if (triageScore !== undefined) updateData.triageScore = triageScore;

        await db.update(scans).set(updateData).where(eq(scans.id, scanId));

        return NextResponse.json({ success: true, scanId });
    } catch (error) {
        console.error("[/api/scans/:id] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// GET /api/scans/[id] — Get single scan details
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scanId = parseInt(params.id);
        if (isNaN(scanId)) {
            return NextResponse.json({ error: "Invalid scan ID" }, { status: 400 });
        }

        const scan = await db.query.scans.findFirst({
            where: eq(scans.id, scanId),
            with: { patient: true, doctor: true },
        });

        if (!scan) {
            return NextResponse.json({ error: "Scan not found" }, { status: 404 });
        }

        return NextResponse.json({ scan });
    } catch (error) {
        console.error("[/api/scans/:id] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
