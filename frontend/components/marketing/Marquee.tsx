'use client';

import { useRef } from 'react';
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useVelocity,
  useAnimationFrame
} from 'framer-motion';
import Image from 'next/image';

const wrap = (min: number, max: number, v: number) => {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
};

const diseases = [
  "ATRIAL FIBRILLATION", "BRAIN TUMOR", "BREAST CANCER", "CARDIOMEGALY",
  "CATARACT", "COVID-19", "DIABETIC RETINOPATHY", "GLAUCOMA",
  "INTRACRANIAL HEMORRHAGE", "LUNG NODULE", "MELANOMA", "MULTIPLE SCLEROSIS",
  "PNEUMONIA", "TUBERCULOSIS", "ALZHEIMER'S", "ARTHRITIS", "FRACTURE", "PNEUMOTHORAX"
];

const icons = [
  "amul.svg", "checkio.svg", "checkmk.svg", "deno.svg", "framework7.svg",
  "intermarche.svg", "johndeere.svg", "kit.svg", "listenhub.svg", "mcdonalds.svg",
  "mdbook.svg", "netcup.svg", "onstar.svg", "sinaweibo.svg", "teratail.svg",
  "xrp.svg", "yamahacorporation.svg"
];

function ParallaxText({ children, baseVelocity = 100 }: { children: React.ReactNode; baseVelocity: number }) {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 400
  });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], {
    clamp: false
  });

  // Wrap the content to create infinite scroll effect
  // Adjust range based on content width approx
  const x = useTransform(baseX, (v) => `${wrap(-20, -45, v)}%`);

  const directionFactor = useRef<number>(1);
  useAnimationFrame((t, delta) => {
    let moveBy = directionFactor.current * baseVelocity * (delta / 1000);

    // Apply strict "move only" + "boost on scroll"
    // If not scrolling, smoothVelocity is ~0, so boost is 0. 
    // We want default speed (moveBy) to be slow, and boosted significantly by velocityFactor.
    
    // We multiply 'moveBy' by (1 + abs(velocity))
    // If velocityFactor is 0, we just move by 'moveBy'.
    // If velocityFactor is 5, we move 6x faster.
    
    if (velocityFactor.get() !== 0) {
      directionFactor.current = baseVelocity > 0 ? 1 : -1; // Keep direction steady or allow flip? Original code kept adding.
      // If we are scrolling, we add the boost.
      moveBy += moveBy * (Math.abs(velocityFactor.get()) * 5); // Multiplier for "super fast"
    }

    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div className="overflow-hidden m-0 whitespace-nowrap flex flex-nowrap">
      <motion.div className="flex whitespace-nowrap flex-nowrap gap-12" style={{ x }}>
        {children}
        {children}
        {children}
        {children}
      </motion.div>
    </div>
  );
}

export default function Marquee() {
  return (
    <div className="relative z-10 w-full overflow-hidden border-y border-black/5 bg-white py-12 flex flex-col gap-12">
      
      {/* Row 1: Diseases (Normal Direction) */}
      <ParallaxText baseVelocity={0.5}>
         {diseases.map((item, i) => (
            <div key={`d-${i}`} className="flex items-center gap-8 pl-8">
            <span className="text-6xl font-bold font-['Neue_Montreal','Helvetica',sans-serif] text-black tracking-tight">
                {item}
            </span>
            <div className="h-4 w-4 rounded-full bg-[#00ff99] shadow-[0_0_10px_rgba(0,255,153,0.5)] ring-4 ring-[#00ff99]/20" />
            </div>
        ))}
      </ParallaxText>

      {/* Row 2: Icons (Opposite Direction) */}
      <ParallaxText baseVelocity={-0.5}>
        {icons.map((icon, i) => (
             <div key={`i-${i}`} className="flex items-center justify-center h-20 w-32 pl-12 grayscale hover:grayscale-0 transition-all opacity-50 hover:opacity-100">
                <Image 
                    src={`/icons/${icon}`} 
                    alt="partner" 
                    width={80} 
                    height={80}
                    className="object-contain"
                />
             </div>
        ))}
      </ParallaxText>
    
    </div>
  );
}
