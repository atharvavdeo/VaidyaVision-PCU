"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function OnboardingPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [selected, setSelected] = useState<"doctor" | "patient" | null>(null);
  const [loading, setLoading] = useState(false);
  const [synced, setSynced] = useState(false);

  // Sync user into SQLite DB on load
  useEffect(() => {
    if (!isLoaded || !user || synced) return;

    fetch("/api/users/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: user.fullName || "",
        email: user.primaryEmailAddress?.emailAddress || "",
        imageUrl: user.imageUrl || "",
      }),
    })
      .then((res) => res.json())
      .then(() => setSynced(true))
      .catch((err) => console.error("Failed to sync user:", err));
  }, [isLoaded, user, synced]);

  // Check if already onboarded
  useEffect(() => {
    if (!synced) return;

    fetch("/api/users/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user?.isOnboarded) {
          const role = data.user.role;
          router.push(role === "doctor" ? "/doctor" : "/patient");
        }
      })
      .catch((err) => console.error("Failed to check user:", err));
  }, [synced, router]);

  // Loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F8F3]">
        <div className="text-center">
          <div className="h-8 w-8 mx-auto mb-4 border-4 border-black border-t-[#9BCF53] rounded-full animate-spin" />
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/sign-in");
    return null;
  }

  async function handleContinue() {
    if (!selected || !user) return;

    setLoading(true);
    try {
      const res = await fetch("/api/users/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selected }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to onboard");
      }

      router.push(selected === "doctor" ? "/doctor" : "/patient");
    } catch (error) {
      console.error("Onboarding error:", error);
      alert("Failed to save role. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-[#F6F8F3]">
      {/* LEFT PANEL - Role Selection */}
      <div className="flex flex-col justify-center px-10 lg:px-20 py-12">
        <p className="text-sm text-gray-500 mb-2">Step 1 of 1</p>

        <h1 className="text-4xl lg:text-5xl font-semibold mb-8 text-black">
          How will you use{" "}
          <span className="font-bold">VaidyaVision</span>?
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <RoleCard
            label="Doctor"
            emoji="🩺"
            description="Review scans, diagnose patients, generate reports"
            active={selected === "doctor"}
            onClick={() => setSelected("doctor")}
          />
          <RoleCard
            label="Patient"
            emoji="🏥"
            description="Upload scans, view results, chat with doctor"
            active={selected === "patient"}
            onClick={() => setSelected("patient")}
          />
        </div>

        <button
          disabled={!selected || loading}
          onClick={handleContinue}
          className="w-48 rounded-full bg-[#9BCF53] px-8 py-3 text-black font-medium disabled:opacity-40 hover:bg-[#8ab947] transition-colors disabled:cursor-not-allowed"
        >
          {loading ? "Setting up..." : "Continue →"}
        </button>
      </div>

      {/* RIGHT PANEL - Animated Spirals */}
      <AnimatedSpiralPanel />
    </div>
  );
}

function RoleCard({
  label,
  emoji,
  description,
  active,
  onClick,
}: {
  label: string;
  emoji: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl p-6 border-2 transition-all transform hover:scale-105 text-left ${active
          ? "bg-[#1F2A24] text-white border-[#9BCF53] shadow-lg"
          : "bg-white text-black border-gray-200 hover:border-gray-300"
        }`}
    >
      <div className="text-4xl mb-4">{emoji}</div>
      <p className="font-semibold text-lg">{label}</p>
      <p className={`text-sm mt-1 ${active ? "text-gray-300" : "text-gray-500"}`}>
        {description}
      </p>
    </button>
  );
}

function AnimatedSpiralPanel() {
  return (
    <div className="relative hidden lg:flex items-center justify-center bg-black rounded-l-[40px] overflow-hidden">
      <div className="absolute inset-0">
        <div className="spiral spiral-up" />
        <div className="spiral spiral-down" />
      </div>

      {/* Center content */}
      <div className="relative z-10 text-center text-white px-8">
        <h2 className="text-4xl font-bold mb-4">Welcome to</h2>
        <h3 className="text-6xl font-bold text-[#9BCF53] mb-6">VaidyaVision</h3>
        <p className="text-gray-300 text-lg max-w-md">
          AI-powered medical imaging platform for precision diagnostics
        </p>
      </div>
    </div>
  );
}
