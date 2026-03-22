import ChatView from "@/components/chat/ChatView";

export default function PatientMessagesPage() {
    return (
        <div>
            <ChatView userRole="patient" />
        </div>
    );
}
