import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Look up user in DB for role-based redirect
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  if (!user || !user.isOnboarded) {
    redirect("/onboarding");
  }

  // Redirect to role-specific dashboard
  if (user.role === "doctor") {
    redirect("/doctor");
  } else {
    redirect("/patient");
  }
}
