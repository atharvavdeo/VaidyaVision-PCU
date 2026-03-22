'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  ScanEye,      
  BrainCircuit, 
  LayoutDashboard, 
  ShieldCheck      
} from 'lucide-react';

// --- CONTENT DATA ---
const features = [
  {
    icon: ScanEye,
    title: "Explainable AI by Design",
    description: "Every prediction is accompanied by visual heatmaps and reasoning signals, so clinicians can understand not just the result, but the reasoning behind it."
  },
  {
    icon: BrainCircuit,
    title: "Multi-Expert Medical Models",
    description: "Each scan is routed to a specialized AI expert based on anatomy and modality, ensuring analysis that mirrors real clinical specialization."
  },
  {
    icon: LayoutDashboard,
    title: "Clinician-Centric Dashboard",
    description: "Doctors review predictions, confidence scores, similar past cases, and explanations in a single unified diagnostic workspace."
  },
  {
    icon: ShieldCheck,
    title: "Built for Clinical Scale",
    description: "Designed to handle growing workloads securely, VaidyaVision scales from pilots to hospital-wide deployments without architectural changes."
  }
];

export default function FeaturesSection() {
  const containerRef = useRef<HTMLElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  // Text Animation: Slowly appearing as you scroll
  const textOpacity = useTransform(scrollYProgress, [0.2, 0.5], [0, 0.1]); 
  const textY = useTransform(scrollYProgress, [0.2, 0.5], [100, 0]);

  return (
    <section ref={containerRef} className="relative w-full py-24 md:py-32 bg-[#fafafa] overflow-hidden">
        
        {/* BACKGROUND TEXT: "WHAT WE DO" */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
             <motion.h1 
                style={{ opacity: textOpacity, y: textY }}
                className="text-[13vw] md:text-[15vw] font-black tracking-tighter text-black uppercase leading-none whitespace-nowrap select-none font-['Druk_Wide','Arial_Black',sans-serif]"
             >
                WHAT WE DO.
             </motion.h1>
        </div>

        {/* CONTENT GRID */}
        <div className="relative z-10 container mx-auto px-6 md:px-12">
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {features.map((feature, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="group flex flex-col items-start gap-6"
                    >
                        {/* ICON CONTAINER */}
                        <div className="relative p-5 rounded-2xl bg-white shadow-sm border border-black/5 group-hover:scale-110 group-hover:shadow-md transition-all duration-300 ease-out">
                            <feature.icon strokeWidth={1.5} className="w-8 h-8 text-black group-hover:text-[#4d8c55] transition-colors duration-300" />
                        </div>

                        {/* TEXT CONTENT */}
                        <div className="flex flex-col gap-3">
                            <h3 className="text-xl font-bold text-black tracking-tight group-hover:text-[#4d8c55] transition-colors duration-300">
                                {feature.title}
                            </h3>
                            
                            <p className="text-[15px] leading-relaxed text-gray-600 font-medium">
                                {feature.description}
                            </p>
                        </div>

                    </motion.div>
                ))}
            </div>

        </div>

    </section>
  );
}
