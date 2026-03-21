'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- DATA: ARCHITECTURE POINTS ---
const architecturePoints = [
  {
    title: "Modality-Aware Preprocessing",
    description: "Automatically adapts pipelines for X-ray, CT, MRI, fundus, dermoscopy, and pathology images.",
    className: "md:col-span-1 border-l-4 border-black" 
  },
  {
    title: "Shared Visual Backbone",
    description: "A unified feature extractor trained to capture medical structures across anatomies.",
    className: "md:col-span-1 border-l-4 border-[#2d5a27]" // Dark Green
  },
  {
    title: "Anatomy & Modality Classification",
    description: "Identifies what the image represents before attempting diagnosis.",
    className: "md:col-span-1 border-l-4 border-[#4d8c55]" // Medium Green
  },
  {
    title: "Multi-Expert Routing",
    description: "Routes each case to a specialized AI expert aligned with clinical domains.",
    className: "md:col-span-1 border-l-4 border-[#8fcb81]" // Light Green
  },
  {
    title: "Explainability Engine",
    description: "Generates visual attention maps to reveal what influenced each prediction.",
    className: "md:col-span-1 border-l-4 border-[#b4e6a8]" // Pale Green
  },
  {
    title: "Similar Case Retrieval (RAG)",
    description: "Surfaces clinically similar historical cases to support decision-making.",
    className: "md:col-span-1 border-l-4 border-[#ccff00]" // Neon Green
  },
  {
    title: "Human-in-the-Loop Verification",
    description: "Enables clinician review, correction, and final sign-off before reports are issued.",
    className: "md:col-span-3 border-l-4 border-black"
  }
];

// --- DATA: LAYERS FOR CIRCLES ---
const layers = [
  {
    id: 'product',
    label: 'Product',
    radius: 400, // Largest
    color: 'bg-[#fafafa] border-gray-200', 
    activeColor: 'bg-[#f0fdf4] border-[#4d8c55]', // Green tint
    dots: [
      { label: 'Doctor Dashboard', x: '50%', y: '12%' },
      { label: 'Patient Dashboard', x: '88%', y: '50%' },
      { label: 'Reports', x: '20%', y: '75%' },
      { label: 'Audit Trails', x: '75%', y: '80%' },
    ]
  },
  {
    id: 'orchestration',
    label: 'Orchestration',
    radius: 300,
    color: 'bg-[#f5f5f5] border-gray-300',
    activeColor: 'bg-[#dcfce7] border-[#22c55e]', // Green tint
    dots: [
      { label: 'FastAPI Inference', x: '30%', y: '25%' },
      { label: 'Convex Actions', x: '75%', y: '30%' },
      { label: 'Real-time Events', x: '25%', y: '70%' },
      { label: 'Storage', x: '70%', y: '75%' },
    ]
  },
  {
    id: 'explainability',
    label: 'Explainability',
    radius: 200,
    color: 'bg-[#e5e5e5] border-gray-400',
    activeColor: 'bg-[#bbf7d0] border-[#16a34a]', // Green tint
    dots: [
      { label: 'Grad-CAM', x: '50%', y: '20%' },
      { label: 'Attention Maps', x: '80%', y: '50%' },
      { label: 'Similar Case Search', x: '50%', y: '80%' },
      { label: 'Confidence Scoring', x: '20%', y: '50%' },
    ]
  },
  {
    id: 'core',
    label: 'ML Core',
    radius: 100, // Smallest
    color: 'bg-[#d4d4d4] border-gray-500',
    activeColor: 'bg-[#86efac] border-[#15803d]', // Green tint
    dots: [
      { label: 'Shared Backbone', x: '35%', y: '35%' },
      { label: 'Expert Models', x: '65%', y: '35%' },
      { label: 'Routing Network', x: '35%', y: '65%' },
      { label: 'Fusion Logic', x: '65%', y: '65%' },
    ]
  },
];

export default function ArchitectureSection() {
  const [activeLayer, setActiveLayer] = useState<string | null>(null);

  // Define z-indexes to stack correctly (Smallest on top)
  // core (index 3) -> z-40
  // explain (index 2) -> z-30
  // orch (index 1) -> z-20
  // product (index 0) -> z-10
  
  // Actually, we iterate the layers array which is defined outside-in visually?
  // No, Product is Largest (Radius 400). Core is Smallest (Radius 100).
  // If we want hovered inner circles to capture events and be visible, they should be ON TOP of outer circles.
  // So Smallest = Highest Z.

  return (
    <section className="w-full bg-white text-black py-24 md:py-32 px-6 md:px-12 border-t border-black/5">
        
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
            
            {/* --- LEFT COLUMN: ARCHITECTURE --- */}
            <div className="flex flex-col gap-8">
                
                {/* Header */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="flex flex-col gap-4"
                >
                    <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight font-['Druk_Wide','Arial_Black',sans-serif]">
                        WHAT We are.
                    </h2>
                    <p className="text-xl text-gray-500 font-medium leading-relaxed max-w-lg">
                        A modular, explainable medical AI stack designed for clinical reliability and scale.
                    </p>
                </motion.div>

                {/* 7 Points Grid (Bento) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {architecturePoints.map((point, i) => (
                        <motion.div 
                            key={i}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.05 }}
                            className={`
                                p-5 rounded-xl bg-gray-50 border border-gray-100 hover:shadow-lg transition-all duration-300
                                ${point.className}
                                flex flex-col justify-between gap-3
                            `}
                        >
                            <h3 className="font-bold text-base leading-tight">{point.title}</h3>
                            <p className="text-xs text-gray-600 leading-relaxed font-medium">
                                {point.description}
                            </p>
                        </motion.div>
                    ))}
                </div>

            </div>

             {/* --- RIGHT COLUMN: LAYERED SYSTEM (CIRCLES) --- */}
             <div className="relative flex items-center justify-center min-h-[600px] lg:mt-12">
                 
                 {/* Container for Centered Concentric Circles */}
                 <div className="relative w-full aspect-square max-w-[650px] flex items-center justify-center">
                    
                    {/* Helper Text */}
                     <span className="absolute top-0 right-0 text-xs font-bold text-gray-300 uppercase tracking-widest pointer-events-none">
                         Interactive Layers
                     </span>

                    {/* Render Layers */}
                    {layers.map((layer, index) => {
                         const isActive = activeLayer === layer.id;
                         const zIndex = 10 + index; // 10, 11, 12, 13 => Product (0) is 10, Core (3) is 13.
                                                    // Product is Largest. Core is Smallest.
                                                    // Smallest on Top (z=13) covers Center. Correct.

                         return (
                             <motion.div
                                key={layer.id}
                                className={`
                                    absolute rounded-full transition-all duration-300 ease-out border
                                    flex items-start justify-center pt-6
                                    ${isActive ? layer.activeColor + ' shadow-md' : layer.color}
                                    ${isActive ? 'z-50' : ''} 
                                    /* Lift active layer to top? No, structure breaks if huge layer covers small one. 
                                       Stick to structural z-index unless transparency allows otherwise.
                                       Actually, keeping Z-index static is safer for nested interactions.
                                    */
                                `}
                                style={{
                                    width: `${(layer.radius / 400) * 100}%`,
                                    height: `${(layer.radius / 400) * 100}%`,
                                    zIndex: zIndex 
                                }}
                                onMouseEnter={() => setActiveLayer(layer.id)}
                             >
                                 {/* Label */}
                                 <span className={`
                                     text-[10px] md:text-xs font-bold uppercase tracking-widest transition-colors
                                     ${isActive ? 'text-black opacity-100' : 'text-gray-400 opacity-70'}
                                 `}>
                                     {layer.label}
                                 </span>

                                 {/* Dots */}
                                 <AnimatePresence>
                                     {isActive && layer.dots.map((dot, dIndex) => {
                                         const isLeft = parseFloat(String(dot.x)) < 50;
                                         
                                         return (
                                             <motion.div
                                                 key={dIndex}
                                                 initial={{ scale: 0, opacity: 0 }}
                                                 animate={{ scale: 1, opacity: 1 }}
                                                 exit={{ scale: 0, opacity: 0 }}
                                                 transition={{ delay: dIndex * 0.05 }}
                                                 className="absolute w-4 h-4 bg-black border-2 border-[#ccff00] rounded-full cursor-help hover:scale-125 transition-transform z-[60] group"
                                                 style={{ left: dot.x, top: dot.y }}
                                             >
                                                 {/* Tooltip - Always visible when layer is active */}
                                                 <motion.div 
                                                    initial={{ opacity: 0, x: isLeft ? 10 : -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.1 + (dIndex * 0.05) }}
                                                    className={`absolute ${isLeft ? 'right-full mr-3' : 'left-full ml-3'} top-1/2 -translate-y-1/2 whitespace-nowrap bg-black border border-[#ccff00] text-[#ccff00] text-xs font-bold px-4 py-2 rounded-lg pointer-events-none shadow-[0_4px_20px_rgba(0,0,0,0.2)] z-[70]`}
                                                 >
                                                     {dot.label}
                                                     {/* Tiny triangle */}
                                                     <div className={`absolute top-1/2 -translate-y-1/2 border-4 border-transparent ${isLeft ? 'left-full border-l-[#ccff00]' : 'right-full border-r-[#ccff00]'}`} />
                                                 </motion.div>
                                             </motion.div>
                                         );
                                     })}
                                 </AnimatePresence>

                             </motion.div>
                         );
                    })}

                    {/* Hover Hint */}
                    {!activeLayer && (
                        <div className="absolute pointer-events-none text-[#4d8c55] text-sm font-bold uppercase tracking-widest animate-pulse bg-[#f0fdf4] px-4 py-2 rounded-full border border-[#4d8c55]/20 backdrop-blur-sm">
                            Hover to explore architecture
                        </div>
                    )}

                 </div>
             </div>

        </div>

    </section>
  );
}
