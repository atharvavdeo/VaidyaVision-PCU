"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";

interface RoleBootstrapProps {
    desiredRole: "doctor" | "patient" | "pathologist";
}

export default function RoleBootstrap({ desiredRole }: RoleBootstrapProps) {
    const { user, isLoaded } = useUser();
    const hasRun = useRef(false);

    useEffect(() => {
        if (!isLoaded || !user || hasRun.current) return;
        hasRun.current = true;

        const bootstrap = async () => {
            try {
                await fetch("/api/users/sync", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: user.fullName || "",
                        email: user.primaryEmailAddress?.emailAddress || "",
                        imageUrl: user.imageUrl || "",
                    }),
                });

                // Best-effort role bootstrap for role-scoped app areas.
                await fetch("/api/users/onboard", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ role: desiredRole }),
                });
            } catch {
                // Keep UI functional even if bootstrap call fails transiently.
            }
        };

        void bootstrap();
    }, [desiredRole, isLoaded, user]);

    return null;
}
