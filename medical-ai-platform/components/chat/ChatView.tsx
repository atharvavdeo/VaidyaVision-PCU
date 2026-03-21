"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import {
    Send,
    Sparkles,
    MessageSquare,
    ArrowLeft,
    User,
    Loader2,
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import VoiceInputButton from "@/components/voice/VoiceInputButton";

interface Conversation {
    id: number;
    patient: { id: number; name: string; imageUrl: string | null };
    doctor: { id: number; name: string; imageUrl: string | null };
    messages: { content: string; createdAt: string }[];
    lastMessageAt: string | null;
}

interface Message {
    id: number;
    content: string;
    type: string;
    createdAt: string;
    sender: { id: number; name: string; imageUrl: string | null; role: string };
}

interface ChatViewProps {
    userRole: "doctor" | "patient";
}

export default function ChatView({ userRole }: ChatViewProps) {
    const { user: clerkUser } = useUser();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConvo, setActiveConvo] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<NodeJS.Timeout | null>(null);
    
    const searchParams = useSearchParams();
    const router = useRouter();
    const newChatUserId = searchParams.get("new");
    const [initializingNewChat, setInitializingNewChat] = useState(!!newChatUserId);

    // Fetch conversations on mount
    useEffect(() => {
        fetchConversations();
    }, []);

    // Handle "new chat" auto-select from query param
    useEffect(() => {
        if (!newChatUserId) return;
        
        const startNewChat = async () => {
            try {
                const res = await fetch("/api/conversations", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ otherUserId: parseInt(newChatUserId) })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.conversation?.id) {
                        setActiveConvo(data.conversation.id);
                        // Refresh conversations to ensure it's in the list
                        await fetchConversations();
                        // Clear the query param
                        router.replace(window.location.pathname);
                    }
                }
            } catch (error) {
                console.error("Failed to init new chat:", error);
            } finally {
                setInitializingNewChat(false);
            }
        };

        startNewChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [newChatUserId]);

    // Poll for new messages when a convo is active
    useEffect(() => {
        if (activeConvo) {
            fetchMessages(activeConvo);
            pollRef.current = setInterval(() => fetchMessages(activeConvo), 3000);
        }
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [activeConvo]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    async function fetchConversations() {
        try {
            const res = await fetch("/api/conversations");
            const data = await res.json();
            setConversations(data.conversations || []);
        } catch (err) {
            console.error("Failed to load conversations:", err);
        }
        setLoading(false);
    }

    async function fetchMessages(convoId: number) {
        try {
            const res = await fetch(`/api/conversations/${convoId}/messages`);
            const data = await res.json();
            setMessages(data.messages || []);
        } catch (err) {
            console.error("Failed to load messages:", err);
        }
    }

    async function sendMessage(content?: string) {
        const text = content || input.trim();
        if (!text || !activeConvo) return;

        setSending(true);
        setInput("");
        setSuggestions([]);

        try {
            await fetch(`/api/conversations/${activeConvo}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: text }),
            });
            await fetchMessages(activeConvo);
        } catch (err) {
            console.error("Send error:", err);
        }
        setSending(false);
    }

    async function fetchSuggestions() {
        if (!activeConvo || messages.length === 0) return;

        setLoadingSuggestions(true);
        try {
            const res = await fetch("/api/ai/suggest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: messages.slice(-8).map((m) => ({
                        content: m.content,
                        isCurrentUser: m.sender.name === clerkUser?.fullName,
                    })),
                    context: `${userRole} consultation`,
                }),
            });
            const data = await res.json();
            setSuggestions(data.suggestions || []);
        } catch (err) {
            console.error("Suggestions error:", err);
        }
        setLoadingSuggestions(false);
    }

    const getOtherUser = (convo: Conversation) =>
        userRole === "doctor" ? convo.patient : convo.doctor;

    return (
        <div className="flex h-[calc(100vh-7rem)] bg-cream-100 rounded-[20px] border border-sage-300 border-dashed overflow-hidden">
            {/* Sidebar: Conversation List */}
            <div
                className={`w-80 border-r border-sage-200 flex flex-col bg-cream-50 ${activeConvo ? "hidden md:flex" : "flex"
                    }`}
            >
                <div className="p-4 border-b border-sage-200">
                    <h2 className="font-display font-bold text-olive-900 uppercase tracking-wider text-sm">Messages</h2>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-olive-400" />
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-olive-400">
                            <MessageSquare className="w-10 h-10 mb-3 opacity-40" />
                            <p className="text-sm font-display font-bold">No conversations yet</p>
                            <p className="text-xs mt-1">
                                {userRole === "doctor"
                                    ? "Conversations will appear when patients message you"
                                    : "Start a conversation from a scan review"}
                            </p>
                        </div>
                    ) : (
                        conversations.map((convo) => {
                            const other = getOtherUser(convo);
                            const lastMsg = convo.messages?.[0];
                            const isActive = activeConvo === convo.id;

                            return (
                                <button
                                    key={convo.id}
                                    onClick={() => setActiveConvo(convo.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-sage-100 transition-colors ${isActive ? "bg-sage-200 border-r-2 border-olive-800" : ""
                                        }`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-sage-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        {other.imageUrl ? (
                                            <img
                                                src={other.imageUrl}
                                                alt={other.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <User className="w-5 h-5 text-olive-500" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-display font-bold text-olive-900 truncate">
                                            {other.name}
                                        </p>
                                        {lastMsg && (
                                            <p className="text-xs text-olive-400 truncate">
                                                {lastMsg.content}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Chat Area */}
            {activeConvo ? (
                <div className="flex-1 flex flex-col bg-cream-50">
                    {/* Chat Header */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-sage-200">
                        <button
                            onClick={() => setActiveConvo(null)}
                            className="md:hidden p-1 rounded hover:bg-sage-100"
                        >
                            <ArrowLeft className="w-5 h-5 text-olive-600" />
                        </button>
                        {(() => {
                            const convo = conversations.find((c) => c.id === activeConvo);
                            const other = convo ? getOtherUser(convo) : null;
                            return (
                                <>
                                    <div className="w-8 h-8 rounded-full bg-sage-200 flex items-center justify-center overflow-hidden">
                                        {other?.imageUrl ? (
                                            <img src={other.imageUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-4 h-4 text-olive-500" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-display font-bold text-olive-900">
                                            {other?.name || "User"}
                                        </p>
                                        <p className="text-xs text-green-600 font-medium">● Online</p>
                                    </div>
                                </>
                            );
                        })()}
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                        {messages.map((msg) => {
                            const isMine = msg.sender.name === clerkUser?.fullName;
                            return (
                                <div
                                    key={msg.id}
                                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${isMine
                                                ? "bg-olive-800 text-cream-50 rounded-br-md"
                                                : "bg-sage-200 text-olive-900 rounded-bl-md"
                                            }`}
                                    >
                                        <p>{msg.content}</p>
                                        <p
                                            className={`text-[10px] mt-1 ${isMine ? "text-sage-300" : "text-olive-400"
                                                }`}
                                        >
                                            {new Date(msg.createdAt).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* AI Suggestions */}
                    {suggestions.length > 0 && (
                        <div className="px-4 pb-2 flex gap-2 flex-wrap">
                            {suggestions.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => sendMessage(s)}
                                    className="px-3 py-1.5 bg-sage-100 text-olive-700 border border-sage-300 rounded-full text-xs font-display font-bold hover:bg-sage-200 transition-colors"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input Bar */}
                    <div className="px-4 py-3 border-t border-sage-200">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={fetchSuggestions}
                                disabled={loadingSuggestions}
                                className="p-2 rounded-lg hover:bg-sage-100 text-olive-500 transition-colors"
                                title="AI Suggestions"
                            >
                                {loadingSuggestions ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Sparkles className="w-5 h-5" />
                                )}
                            </button>
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                                    placeholder="Type a message..."
                                    className="w-full px-4 py-2.5 pr-10 bg-cream-100 rounded-xl text-sm border border-sage-300 text-olive-900 focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                                />
                                <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                                    {userRole === "doctor" && (
                                        <VoiceInputButton
                                            onTranscript={(text: string) => sendMessage(text)}
                                            mode="submit"
                                            compact
                                            title="Dictate message"
                                        />
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => sendMessage()}
                                disabled={!input.trim() || sending}
                                className="p-2.5 bg-olive-800 text-cream-50 rounded-xl hover:bg-olive-900 disabled:opacity-40 transition-colors"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 hidden md:flex items-center justify-center text-olive-400 bg-cream-50">
                    <div className="text-center">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40" />
                        <p className="font-display font-bold">Select a conversation</p>
                        <p className="text-sm mt-1">Choose a chat to start messaging</p>
                    </div>
                </div>
            )}
        </div>
    );
}
