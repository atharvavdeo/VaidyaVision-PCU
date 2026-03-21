"use client";

import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import RoleBootstrap from "@/components/auth/RoleBootstrap";

export default function DoctorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-cream-50">
            <RoleBootstrap desiredRole="doctor" />
            <Sidebar role="doctor" />
            <div className="lg:ml-64 transition-all duration-300">
                <TopNav title="Doctor Dashboard" />
                <main className="p-6">{children}</main>
            </div>
        </div>
    );
}
