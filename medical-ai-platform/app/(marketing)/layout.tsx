import Navbar from "@/components/marketing/Navbar";
import MouseFollower from "@/components/marketing/MouseFollower";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#000000] p-4 lg:p-8">
      <div className="relative min-h-[calc(100vh-2rem)] w-full rounded-[3rem] bg-[#f4f4f4] text-black selection:bg-green-500/30 shadow-2xl ring-1 ring-white/10 isolate">
        <MouseFollower />
        
        <div className="sticky top-0 z-50 pointer-events-none">
          <div className="pointer-events-auto">
            <Navbar />
          </div>
        </div>

        <main className="relative z-10">{children}</main>
      </div>
    </div>
  );
}
