"use client";

import { useState, useEffect } from "react";
import { Plus, X, User, Heart, Trash2, Users } from "lucide-react";

interface FamilyMember {
    id: number;
    name: string;
    relation: string;
}

export default function FamilyPage() {
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState("");
    const [relation, setRelation] = useState("spouse");

    useEffect(() => {
        fetchMembers();
    }, []);

    async function fetchMembers() {
        try {
            const res = await fetch("/api/family");
            const data = await res.json();
            setMembers(data.members || []);
        } catch (err) {
            console.error("Failed to load family members:", err);
        }
        setLoading(false);
    }

    async function addMember() {
        if (!name.trim()) return;
        try {
            await fetch("/api/family", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), relation }),
            });
            setName("");
            setRelation("spouse");
            setShowForm(false);
            fetchMembers();
        } catch (err) {
            console.error("Add error:", err);
        }
    }

    async function removeMember(id: number) {
        try {
            await fetch("/api/family", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ memberId: id }),
            });
            fetchMembers();
        } catch (err) {
            console.error("Remove error:", err);
        }
    }

    const RELATION_EMOJI: Record<string, string> = {
        spouse: "💑",
        child: "👶",
        parent: "👨‍👩‍👦",
        sibling: "👫",
        other: "👤",
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-display font-bold text-olive-900">Family Members</h1>
                    <p className="text-olive-500 text-sm mt-1">
                        Manage family members who can share your health records
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-olive-800 text-cream-50 rounded-xl text-sm font-display font-bold uppercase tracking-wider hover:bg-olive-900 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Member
                </button>
            </div>

            {/* Add Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-olive-900/40 backdrop-blur-sm">
                    <div className="bg-cream-50 rounded-2xl p-6 w-full max-w-md shadow-xl border border-sage-300">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-display font-bold text-olive-900">Add Family Member</h3>
                            <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-sage-100">
                                <X className="w-5 h-5 text-olive-600" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-display font-bold text-olive-700 uppercase tracking-wider">Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="mt-1 w-full px-3 py-2 border border-sage-300 rounded-xl text-sm bg-cream-100 text-olive-900 focus:outline-none focus:ring-2 focus:ring-olive-500"
                                    placeholder="Full name"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-display font-bold text-olive-700 uppercase tracking-wider">Relationship</label>
                                <select
                                    value={relation}
                                    onChange={(e) => setRelation(e.target.value)}
                                    className="mt-1 w-full px-3 py-2 border border-sage-300 rounded-xl text-sm bg-cream-100 text-olive-900 focus:outline-none focus:ring-2 focus:ring-olive-500"
                                >
                                    <option value="spouse">Spouse</option>
                                    <option value="child">Child</option>
                                    <option value="parent">Parent</option>
                                    <option value="sibling">Sibling</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <button
                                onClick={addMember}
                                disabled={!name.trim()}
                                className="w-full py-2.5 bg-olive-800 text-cream-50 rounded-xl font-display font-bold text-sm uppercase tracking-wider hover:bg-olive-900 disabled:opacity-40 transition-colors"
                            >
                                Add Member
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Members List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-olive-200 border-t-olive-800 rounded-full animate-spin" />
                </div>
            ) : members.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-olive-400">
                    <Users className="w-16 h-16 mb-4 opacity-40" />
                    <p className="text-lg font-display font-bold">No family members added</p>
                    <p className="text-sm mt-1">Add family members to share your health records</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {members.map((m) => (
                        <div
                            key={m.id}
                            className="bg-cream-100 rounded-[20px] border border-sage-300 border-dashed p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
                        >
                            <div className="w-12 h-12 rounded-full bg-sage-200 flex items-center justify-center text-2xl flex-shrink-0">
                                {RELATION_EMOJI[m.relation] || "👤"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-display font-bold text-olive-900">{m.name}</p>
                                <p className="text-xs text-olive-500 capitalize">{m.relation}</p>
                            </div>
                            <button
                                onClick={() => removeMember(m.id)}
                                className="p-2 rounded-lg text-olive-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
