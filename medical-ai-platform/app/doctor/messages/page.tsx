export const dynamic = "force-dynamic";
import ChatView from "@/components/chat/ChatView";

export default function DoctorMessagesPage() {
    return (
        <div>
            <ChatView userRole="doctor" />
        </div>
    );
}
