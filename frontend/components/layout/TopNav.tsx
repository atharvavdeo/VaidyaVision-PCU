"use client";

import { UserButton } from "@clerk/nextjs";
import { Bell, Search, Menu, MessageSquare, Scan, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { notificationsApi } from "@/lib/api/notifications";

interface TopNavProps {
    title: string;
    onMenuClick?: () => void;
}

interface Notification {
    id: number;
    type: string;
    message: string;
    link: string | null;
    isRead: boolean;
    createdAt: string;
}

export default function TopNav({ title, onMenuClick }: TopNavProps) {
    const [searchOpen, setSearchOpen] = useState(false);
    const [showNotifs, setShowNotifs] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const notifRef = useRef<HTMLDivElement>(null);

    // Fetch notifications on mount + poll every 10s
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 10000);
        return () => clearInterval(interval);
    }, []);

    // Click outside to close
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setShowNotifs(false);
            }
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    async function fetchNotifications() {
        try {
            const data = await notificationsApi.list();
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch { } // silent fail
    }

    async function markAllRead() {
        try {
            await notificationsApi.markAllRead();
            setUnreadCount(0);
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        } catch { }
    }

    const NOTIF_ICONS: Record<string, React.ElementType> = {
        message_received: MessageSquare,
        scan_completed: Scan,
    };

    return (
        <header className="sticky top-0 z-30 bg-cream-50/80 backdrop-blur-md border-b border-sage-200">
            <div className="flex items-center justify-between h-16 px-6">
                {/* Left: menu toggle + page title */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden p-2 rounded-lg hover:bg-sage-100 text-olive-600"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-display font-semibold text-olive-900">{title}</h1>
                </div>

                {/* Right: search + notifications + user */}
                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative hidden sm:block">
                        {searchOpen ? (
                            <input
                                type="text"
                                autoFocus
                                placeholder="Search patients, scans..."
                                className="w-64 pl-10 pr-4 py-2 rounded-lg bg-cream-100 border border-sage-300 text-sm text-olive-900 focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                                onBlur={() => setSearchOpen(false)}
                            />
                        ) : null}
                        <button
                            onClick={() => setSearchOpen(!searchOpen)}
                            className="p-2 rounded-lg hover:bg-sage-100 text-olive-500"
                        >
                            <Search className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Notification bell with dropdown */}
                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={() => {
                                setShowNotifs(!showNotifs);
                                if (!showNotifs && unreadCount > 0) markAllRead();
                            }}
                            className="relative p-2 rounded-lg hover:bg-sage-100 text-olive-500"
                        >
                            <Bell className="w-5 h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                            )}
                        </button>

                        {showNotifs && (
                            <div className="absolute right-0 mt-2 w-80 bg-cream-50 rounded-xl border border-sage-200 shadow-xl overflow-hidden z-50">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-sage-200">
                                    <h3 className="text-sm font-display font-bold uppercase tracking-wider text-olive-900">Notifications</h3>
                                    <button
                                        onClick={() => setShowNotifs(false)}
                                        className="p-1 rounded hover:bg-sage-100"
                                    >
                                        <X className="w-4 h-4 text-olive-400" />
                                    </button>
                                </div>

                                <div className="max-h-72 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="py-8 text-center text-olive-400 text-sm">
                                            No notifications yet
                                        </div>
                                    ) : (
                                        notifications.map((n) => {
                                            const Icon = NOTIF_ICONS[n.type] || Bell;
                                            return (
                                                <a
                                                    key={n.id}
                                                    href={n.link || "#"}
                                                    className={`flex items-start gap-3 px-4 py-3 hover:bg-sage-100 transition-colors ${!n.isRead ? "bg-cream-200" : ""
                                                        }`}
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-sage-200 flex items-center justify-center flex-shrink-0">
                                                        <Icon className="w-4 h-4 text-olive-700" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-olive-900">{n.message}</p>
                                                        <p className="text-xs text-olive-400 mt-0.5">
                                                            {new Date(n.createdAt).toLocaleString([], {
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                                month: "short",
                                                                day: "numeric",
                                                            })}
                                                        </p>
                                                    </div>
                                                    {!n.isRead && (
                                                        <div className="w-2 h-2 bg-olive-800 rounded-full mt-2" />
                                                    )}
                                                </a>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Clerk user button */}
                    <UserButton
                        afterSignOutUrl="/"
                        appearance={{
                            elements: {
                                avatarBox: "w-9 h-9",
                            },
                        }}
                    />
                </div>
            </div>
        </header>
    );
}
