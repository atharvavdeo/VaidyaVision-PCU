import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import type { notifications as NotificationsSchema } from "@/lib/db/schema";
import { InferInsertModel } from "drizzle-orm";

type NotificationInsert = InferInsertModel<typeof notifications>;

export async function createNotification(params: {
    userId: number;
    type: NotificationInsert["type"];
    message: string;
    link?: string;
}) {
    try {
        await db.insert(notifications).values({
            userId: params.userId,
            type: params.type,
            message: params.message,
            link: params.link,
        });
        return true;
    } catch (error) {
        console.error("[createNotification] Failed to insert notification:", params, error);
        return false;
    }
}
