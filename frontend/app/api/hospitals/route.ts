import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hospitals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser, unauthorized } from "@/lib/api-auth";

// GET /api/hospitals — list all active hospitals
export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user) return unauthorized();

        const list = await db.select({
            id: hospitals.id,
            code: hospitals.code,
            slug: hospitals.slug,
            name: hospitals.name,
            type: hospitals.type,
            city: hospitals.city,
            locality: hospitals.locality,
            pincode: hospitals.pincode,
            phone: hospitals.phone,
            logoUrl: hospitals.logoUrl,
        }).from(hospitals).where(eq(hospitals.isActive, true));

        return NextResponse.json({ hospitals: list });
    } catch (error) {
        console.error("[GET /api/hospitals]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
