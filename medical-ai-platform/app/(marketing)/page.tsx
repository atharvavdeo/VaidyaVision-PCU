// app/(marketing)/page.tsx

import HeroSection from "./sections/Hero";
import DatasetsSection from "./sections/Datasets";
import Marquee from "@/components/marketing/Marquee";
import Footer from "@/components/marketing/Footer";
import FeaturesSection from "./sections/Features";
import ArchitectureSection from "./sections/Architecture";
import CTASection from "./sections/CTA";

// This is a Server Component. It creates the HTML structure.
export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />
      <Marquee />
      <FeaturesSection />
      <ArchitectureSection />
      <DatasetsSection />
      <CTASection />
      <Footer />
    </div>
  );
}
