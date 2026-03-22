import Navbar from "@/components/marketing/Navbar";
import MouseFollower from "@/components/marketing/MouseFollower";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen bg-[#000000] p-4 lg:p-8 overflow-hidden">
      <div className="relative h-full w-full rounded-[3rem] bg-[#f4f4f4] text-black selection:bg-green-500/30 overflow-hidden shadow-2xl ring-1 ring-white/10 isolate">
        <MouseFollower />
        
        {/* Navigation - Stays at the top */}
        <div className="absolute top-0 left-0 right-0 z-50 pointer-events-none">
          <div className="pointer-events-auto">
            <Navbar />
          </div>
        </div>
        
        {/* Page Content - Scrollable */}
        <div className="absolute inset-0 overflow-y-auto z-10">
          <main className="relative min-h-full">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
