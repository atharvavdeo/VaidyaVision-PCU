import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { caseArtifacts, cases } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
    getAuthUser, unauthorized, forbidden, badRequest, notFound,
    resolveHospital, patientArtifactProjection,
} from "@/lib/api-auth";

// GET /api/cases/[id]/artifacts — list artifacts (role-scoped)
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthUser();
        if (!user) return unauthorized();

        const caseId = parseInt(params.id);
        if (isNaN(caseId)) return badRequest("Invalid case id");

        const case_ = await db.query.cases.findFirst({ where: eq(cases.id, caseId) });
        if (!case_) return notFound("Case not found");

        // PATIENT: only visible artifacts for released case
        if (user.role === "patient") {
            if (case_.patientId !== user.id) return forbidden();
            if (case_.patientVisibilityStatus !== "released") return forbidden("Case not released");

            const artifacts = await db.query.caseArtifacts.findMany({
                where: and(
                    eq(caseArtifacts.caseId, caseId),
                    eq(caseArtifacts.patientVisible, true)
                ),
            });
            return NextResponse.json({ artifacts: artifacts.map(patientArtifactProjection) });
        }

        // CLINICIANS: must be member of same hospital
        const resolution = await resolveHospital(user.id, case_.hospitalId);
        if (!resolution.ok) return forbidden("Not a member of this hospital");

        const artifacts = await db.query.caseArtifacts.findMany({
            where: eq(caseArtifacts.caseId, caseId),
            with: { uploadedByUser: true },
        });

        return NextResponse.json({ artifacts });
    } catch (error) {
        console.error("[GET /api/cases/[id]/artifacts]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST /api/cases/[id]/artifacts — register artifact after upload
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthUser();
        if (!user) return unauthorized();

        if (!["doctor", "pathologist", "hospital_admin"].includes(user.role)) {
            return forbidden("Clinician access only");
        }

        const caseId = parseInt(params.id);
        if (isNaN(caseId)) return badRequest("Invalid case id");

        const case_ = await db.query.cases.findFirst({ where: eq(cases.id, caseId) });
        if (!case_) return notFound("Case not found");

        const resolution = await resolveHospital(user.id, case_.hospitalId);
        if (!resolution.ok) return forbidden("Not a member of this hospital");
        const { membership } = resolution;

        const body = await req.json();
        const { artifactType, processingPipeline, fileUrl, originalFilename, mimeType, sizeBytes, modalityHint, thumbnailUrl } = body;

        if (!artifactType || !processingPipeline || !fileUrl) {
            return badRequest("artifactType, processingPipeline, fileUrl required");
        }

        const [artifact] = await db.insert(caseArtifacts).values({
            caseId,
            hospitalId: case_.hospitalId,
            patientId: case_.patientId,
            uploadedByUserId: user.id,
            uploadedByMembershipId: membership.id,
            artifactType,
            processingPipeline,
            fileUrl,
            originalFilename: originalFilename || null,
            mimeType: mimeType || null,
            sizeBytes: sizeBytes || null,
            modalityHint: modalityHint || null,
            thumbnailUrl: thumbnailUrl || null,
            status: "uploaded",
            patientVisible: false,
        }).returning();

        return NextResponse.json({ artifact }, { status: 201 });
    } catch (error) {
        console.error("[POST /api/cases/[id]/artifacts]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
