"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Upload,
    MessageSquare,
    FileText,
    Calendar,
    Users,
    Scan,
    Settings,
    ChevronLeft,
    ChevronRight,
    Stethoscope,
    Heart,
    Pill,
    Dumbbell,
    ClipboardList,
    BookOpen,
    Code2,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
    label: string;
    href: string;
    icon: React.ElementType;
}

const doctorNav: NavItem[] = [
    { label: "Dashboard", href: "/doctor", icon: LayoutDashboard },
    { label: "Scan Queue", href: "/doctor/queue", icon: Scan },
    { label: "Patients", href: "/doctor/patients", icon: Users },
    { label: "Prescriptions", href: "/doctor/prescriptions", icon: ClipboardList },
    { label: "Upload Rx", href: "/doctor/scan/prescriptions", icon: Upload },
    { label: "Research", href: "/doctor/research", icon: BookOpen },
    { label: "Messages", href: "/doctor/messages", icon: MessageSquare },
    { label: "Reports", href: "/doctor/reports", icon: FileText },
    { label: "Appointments", href: "/doctor/appointments", icon: Calendar },
    { label: "Developer API", href: "/doctor/developer", icon: Code2 },
    { label: "Profile", href: "/doctor/profile", icon: Users },
];

const patientNav: NavItem[] = [
    { label: "Dashboard", href: "/patient", icon: LayoutDashboard },
    { label: "Upload Scan", href: "/patient/upload", icon: Upload },
    { label: "Prescriptions", href: "/patient/upload-prescription", icon: FileText },
    { label: "Medications", href: "/patient/medications", icon: Pill },
    { label: "Exercise", href: "/patient/exercise", icon: Dumbbell },
    { label: "Research", href: "/patient/research", icon: BookOpen },
    { label: "My Scans", href: "/patient/scans", icon: Scan },
    { label: "Messages", href: "/patient/messages", icon: MessageSquare },
    { label: "Appointments", href: "/patient/appointments", icon: Calendar },
    { label: "Family", href: "/patient/family", icon: Heart },
];

interface SidebarProps {
    role: "doctor" | "patient";
}

export default function Sidebar({ role }: SidebarProps) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const navItems = role === "doctor" ? doctorNav : patientNav;

    return (
        <aside
            className={cn(
                "fixed left-0 top-0 z-40 h-screen bg-olive-900 text-cream-50 transition-all duration-300 flex flex-col border-r border-olive-800",
                collapsed ? "w-16" : "w-64"
            )}
        >
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 py-5 border-b border-olive-800">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-cream-50 text-olive-900 flex items-center justify-center">
                    <Stethoscope className="w-5 h-5" />
                </div>
                {!collapsed && (
                    <span className="text-lg font-display font-bold tracking-tight text-cream-50">
                        VAIDYAVISION
                    </span>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive =
                        pathname === item.href ||
                        (item.href !== `/${role}` && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                                isActive
                                    ? "bg-cream-50 text-olive-900 shadow-md"
                                    : "text-olive-300 hover:text-cream-50 hover:bg-olive-800"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-olive-900" : "text-olive-400 group-hover:text-cream-50")} />
                            {!collapsed && <span>{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Role badge + collapse toggle */}
            <div className="px-2 py-3 border-t border-olive-800">
                {!collapsed && (
                    <div className="px-3 mb-2">
                        <span
                            className={cn(
                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-olive-700",
                                role === "doctor"
                                    ? "bg-olive-800 text-cream-100"
                                    : "bg-blue-900 text-blue-100"
                            )}
                        >
                            {role === "doctor" ? "DR. CHEN" : "PATIENT"}
                        </span>
                    </div>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-olive-400 hover:text-cream-50 hover:bg-olive-800 w-full text-sm transition-colors"
                >
                    {collapsed ? (
                        <ChevronRight className="w-5 h-5" />
                    ) : (
                        <>
                            <ChevronLeft className="w-5 h-5" />
                            <span>Collapse</span>
                        </>
                    )}
                </button>
            </div>
        </aside>
    );
}
