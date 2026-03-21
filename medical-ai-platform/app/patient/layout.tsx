"use client";

import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";

export default function PatientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-cream-50">
            <Sidebar role="patient" />
            <div className="lg:ml-64 transition-all duration-300">
                <TopNav title="My Care" />
                <main className="p-6">{children}</main>
            </div>
        </div>
    );
}
