"use client";

import { useState, useEffect } from "react";
import { Loader2, Mail, PlugZap, Unplug, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export default function EmailSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<{
        connected: boolean;
        providerEmail?: string;
        status?: string;
    } | null>(null);
    const [disconnecting, setDisconnecting] = useState(false);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/integrations/google/status");
            const data = await res.json();
            setStatus(data);
        } catch {
            setStatus({ connected: false });
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = () => {
        window.location.href = "/api/integrations/google/start";
    };

    const handleDisconnect = async (e: React.MouseEvent) => {
        e.preventDefault();
        setDisconnecting(true);
        try {
            await fetch("/api/integrations/google/disconnect", { method: "POST" });
            setStatus({ connected: false });
        } catch {
            alert("Failed to disconnect. Try again.");
        } finally {
            setDisconnecting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-olive-800" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            <h1 className="text-2xl font-display font-bold text-olive-900 mb-2">
                Email Settings
            </h1>
            <p className="text-olive-600 text-sm mb-8">
                Connect your Gmail account to send patient reports directly from your mailbox.
                This is separate from your VaidyaVision login.
            </p>

            <div className="bg-cream-50 rounded-2xl border border-sage-300 shadow-lg overflow-hidden">
                {/* Status Header */}
                <div className={`px-8 py-6 flex items-center gap-4 ${
                    status?.connected && status?.status === "active"
                        ? "bg-emerald-50 border-b border-emerald-200"
                        : status?.connected && status?.status === "expired"
                        ? "bg-amber-50 border-b border-amber-200"
                        : "bg-cream-100 border-b border-sage-200"
                }`}>
                    {status?.connected && status?.status === "active" ? (
                        <>
                            <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" />
                            <div>
                                <p className="font-display font-bold text-emerald-900">Gmail Connected</p>
                                <p className="text-sm text-emerald-700">{status.providerEmail}</p>
                            </div>
                        </>
                    ) : status?.connected && status?.status === "expired" ? (
                        <>
                            <AlertCircle className="w-8 h-8 text-amber-600 flex-shrink-0" />
                            <div>
                                <p className="font-display font-bold text-amber-900">Connection Expired</p>
                                <p className="text-sm text-amber-700">
                                    {status.providerEmail} — please reconnect
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <XCircle className="w-8 h-8 text-olive-400 flex-shrink-0" />
                            <div>
                                <p className="font-display font-bold text-olive-700">Not Connected</p>
                                <p className="text-sm text-olive-500">
                                    Reports will be sent via VaidyaVision platform email
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Actions */}
                <div className="px-8 py-6 space-y-4">
                    <div className="text-sm text-olive-600 space-y-2">
                        <p className="flex items-start gap-2">
                            <Mail className="w-4 h-4 mt-0.5 text-olive-500 flex-shrink-0" />
                            When connected, patient report emails are sent directly from your Gmail address.
                        </p>
                        <p className="flex items-start gap-2">
                            <PlugZap className="w-4 h-4 mt-0.5 text-olive-500 flex-shrink-0" />
                            This grants VaidyaVision permission to send emails on your behalf. 
                            We never read your inbox.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        {(!status?.connected || status?.status !== "active") && (
                            <button
                                onClick={handleConnect}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-700 text-white rounded-xl font-display font-bold text-sm hover:bg-blue-800 transition shadow-lg shadow-blue-700/20"
                            >
                                <Mail className="w-4 h-4" />
                                {status?.connected ? "Reconnect Gmail" : "Connect Gmail"}
                            </button>
                        )}
                        {status?.connected && (
                            <button
                                onClick={handleDisconnect}
                                disabled={disconnecting}
                                className="flex items-center gap-2 px-6 py-3 bg-cream-100 text-olive-700 border border-sage-300 rounded-xl font-display font-bold text-sm hover:bg-cream-200 transition disabled:opacity-50"
                            >
                                {disconnecting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Unplug className="w-4 h-4" />
                                )}
                                Disconnect
                            </button>
                        )}
                    </div>
                </div>

                {/* Privacy Note */}
                <div className="px-8 py-4 bg-cream-100 border-t border-sage-200 text-xs text-olive-500">
                    <p>
                        <strong>Privacy:</strong> OAuth tokens are encrypted at rest with AES-256-GCM.
                        Your Gmail password is never stored. You can revoke access at any time from 
                        Google Account settings or by disconnecting here.
                    </p>
                </div>
            </div>
        </div>
    );
}
