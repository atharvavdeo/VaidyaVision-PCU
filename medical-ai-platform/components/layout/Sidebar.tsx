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
    ChevronLeft,
    ChevronRight,
    Stethoscope,
    Heart,
    Pill,
    Dumbbell,
    ClipboardList,
    BookOpen,
    FolderOpen,
    Inbox,
    Settings,
    FlaskConical,
    UserCircle,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
    label: string;
    href: string;
    icon: React.ElementType;
}

// ── Doctor nav ────────────────────────────────────────────────────────────────
const doctorNav: NavItem[] = [
    { label: "Dashboard",        href: "/doctor",                 icon: LayoutDashboard },
    { label: "Case Inbox",       href: "/doctor/cases",           icon: Inbox },
    { label: "Scan Queue",       href: "/doctor/queue",           icon: Scan },
    { label: "Patients",         href: "/doctor/patients",        icon: Users },
    { label: "Reports",          href: "/doctor/reports",         icon: FileText },
    { label: "Prescriptions",    href: "/doctor/prescriptions",   icon: ClipboardList },
    { label: "Upload Rx",        href: "/doctor/scan/prescriptions", icon: Upload },
    { label: "Messages",         href: "/doctor/messages",        icon: MessageSquare },
    { label: "Appointments",     href: "/doctor/appointments",    icon: Calendar },
    { label: "Research",         href: "/doctor/research",        icon: BookOpen },
    { label: "Profile",          href: "/doctor/profile",         icon: UserCircle },
    { label: "Hospital Settings",href: "/doctor/settings/hospital", icon: Settings },
];

// ── Pathologist nav ───────────────────────────────────────────────────────────
const pathologistNav: NavItem[] = [
    { label: "Dashboard",        href: "/pathologist",            icon: LayoutDashboard },
    { label: "Upload Case",      href: "/pathologist",            icon: Upload },          // main upload wizard lives on /pathologist
    { label: "Recent Cases",     href: "/doctor/cases",           icon: FolderOpen },      // shared case list, read-only view
    { label: "Patients",         href: "/doctor/patients",        icon: Users },
    { label: "Messages",         href: "/doctor/messages",        icon: MessageSquare },
    { label: "Profile",          href: "/doctor/profile",         icon: UserCircle },
    { label: "Hospital Context", href: "/doctor/settings/hospital", icon: FlaskConical },
];

// ── Patient nav ───────────────────────────────────────────────────────────────
const patientNav: NavItem[] = [
    { label: "Dashboard",        href: "/patient",                icon: LayoutDashboard },
    { label: "My Reports",       href: "/patient/cases",          icon: FileText },
    { label: "Upload Scan",      href: "/patient/upload",         icon: Upload },
    { label: "Prescriptions",    href: "/patient/upload-prescription", icon: ClipboardList },
    { label: "Medications",      href: "/patient/medications",    icon: Pill },
    { label: "Exercise",         href: "/patient/exercise",       icon: Dumbbell },
    { label: "Messages",         href: "/patient/messages",       icon: MessageSquare },
    { label: "Appointments",     href: "/patient/appointments",   icon: Calendar },
    { label: "Family",           href: "/patient/family",         icon: Heart },
    { label: "Research",         href: "/patient/research",       icon: BookOpen },
];

// ── Role meta ─────────────────────────────────────────────────────────────────
const roleMeta: Record<"doctor" | "pathologist" | "patient", { label: string; badge: string; badgeClass: string }> = {
    doctor:      { label: "VAIDYAVISION", badge: "DOCTOR",      badgeClass: "bg-olive-800 text-cream-100 border-olive-700" },
    pathologist: { label: "VAIDYAVISION", badge: "PATHOLOGIST", badgeClass: "bg-emerald-900 text-emerald-100 border-emerald-700" },
    patient:     { label: "VAIDYAVISION", badge: "PATIENT",     badgeClass: "bg-blue-900   text-blue-100   border-blue-700" },
};

interface SidebarProps {
    role: "doctor" | "pathologist" | "patient";
}

export default function Sidebar({ role }: SidebarProps) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    const navItems =
        role === "doctor"      ? doctorNav      :
        role === "pathologist" ? pathologistNav :
                                 patientNav;

    const meta = roleMeta[role];
    const baseHref = role === "patient" ? "/patient" : role === "pathologist" ? "/pathologist" : "/doctor";

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
                        {meta.label}
                    </span>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive =
                        pathname === item.href ||
                        (item.href !== baseHref && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.label + item.href}
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
                        <span className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                            meta.badgeClass
                        )}>
                            {meta.badge}
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
