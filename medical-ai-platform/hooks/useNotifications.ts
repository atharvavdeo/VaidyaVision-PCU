import { useState, useEffect } from "react";

export interface Notification {
    id: number;
    type: string;
    message: string;
    link: string | null;
    isRead: boolean;
    createdAt: string;
}

export function useNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async () => {
        try {
            const res = await fetch("/api/notifications");
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch {
            // silent catch
        }
    };

    const markAllRead = async () => {
        try {
            await fetch("/api/notifications", { method: "PATCH" });
            setUnreadCount(0);
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        } catch {
            // silent catch
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 5 seconds per requirements
        const interval = setInterval(fetchNotifications, 5000);
        return () => clearInterval(interval);
    }, []);

    return { notifications, unreadCount, markAllRead, refresh: fetchNotifications };
}
