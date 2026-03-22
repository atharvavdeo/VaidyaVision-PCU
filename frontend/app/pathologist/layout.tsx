"use client";

import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import RoleBootstrap from "@/components/auth/RoleBootstrap";

export default function PathologistLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-cream-50">
            <RoleBootstrap desiredRole="pathologist" />
            <Sidebar role="pathologist" />
            <div className="lg:ml-64 transition-all duration-300">
                <TopNav title="Pathologist Portal" />
                <main className="p-6">{children}</main>
            </div>
        </div>
    );
}
