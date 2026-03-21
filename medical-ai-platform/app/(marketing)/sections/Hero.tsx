'use client';

import { motion } from 'framer-motion';
import { ArrowDown, Star } from 'lucide-react';
import SplineBackground from '@/components/marketing/SplineBackground';

export default function HeroSection() {
  return (
    <section className="relative z-30 flex min-h-screen flex-col justify-center px-6 lg:px-16 pt-32 pb-12 pointer-events-none">
      {/* Spline 3D Background - Only in Hero section */}
      <SplineBackground />
      <div className="w-full relative pointer-events-auto flex flex-col items-start">
        
        {/* Line 1: Pixels */}
        <div className="overflow-hidden w-full">
          <motion.h1
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }} // Simplified animation for stability
            transition={{ duration: 0.5 }}
            className="text-[13vw] leading-[0.8] font-bold tracking-tighter text-black select-none text-left font-['Aeonik','Inter',sans-serif]"
          >
            Pixels
          </motion.h1>
        </div>

        {/* Line 2: TO CLINICAL (Aligned Flex) */}
        <div className="w-full flex items-center gap-6 lg:gap-10 overflow-hidden mt-2 lg:mt-4">
           
           {/* Solid White Button (No Glassmorphism) */}
           <div className="hidden lg:flex items-center justify-center shrink-0">
             <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              onClick={() => {
                const element = document.getElementById('datasets');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="group relative h-24 w-24 xl:h-32 xl:w-32 flex items-center justify-center rounded-full bg-white border-[3px] border-black cursor-pointer shadow-none hover:bg-gray-50 transition-colors"
            >
              <div className="overflow-hidden h-10 w-10 flex flex-col items-center justify-start gap-4">
                 <motion.div
                   animate={{ y: [0, 24, 0] }} // Reduced travel distance
                   transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                   className="flex flex-col gap-4"
                 >
                     <ArrowDown className="h-8 w-8 text-black stroke-[3px]" />
                     <ArrowDown className="h-8 w-8 text-black stroke-[3px]" />
                 </motion.div>
              </div>
            </motion.div>
           </div>

           {/* TO CLINICAL Text */}
           <motion.h1
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-[13vw] leading-[0.8] font-black tracking-tighter text-[#1a1a1a] select-none font-['Druk_Wide','Arial_Black',sans-serif] uppercase"
            >
              TO CLINICAL
            </motion.h1>
        </div>

        {/* Line 3: reasoning */}
        <div className="w-full mt-2 lg:mt-4">
           {/* reasoning Text */}
           <div className="overflow-hidden">
             <motion.h1
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-[13vw] leading-[0.8] font-bold tracking-tighter text-[#333333] select-none text-left font-['Neue_Montreal','Helvetica',sans-serif]"
              >
                reasoning
              </motion.h1>
           </div>
        </div>

        {/* Line 4: Description & Reviews - BOTTOM */}
        <div className="w-full flex flex-col md:flex-row items-start md:items-end justify-between gap-8 mt-12 pb-8">
            
            {/* Description */}
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-lg md:text-xl font-medium leading-relaxed text-black max-w-xl text-left"
            >
              VaidyaVision analyzes medical images using multiple specialized AI experts, retrieves similar past cases, and explains every decision visually.
            </motion.p>

            {/* Reviews Badge */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-4 rounded-full bg-white border border-black/10 px-4 py-3 shadow-md"
            >
                <div className="flex -space-x-3">
                    {/* Fake avatars using colors */}
                    <div className="h-10 w-10 rounded-full border-2 border-white bg-blue-500" />
                    <div className="h-10 w-10 rounded-full border-2 border-white bg-green-500" />
                    <div className="h-10 w-10 rounded-full border-2 border-white bg-purple-500" />
                </div>
                <div className="flex flex-col items-start">
                    <div className="flex text-yellow-500 gap-0.5">
                        <Star className="h-3 w-3 fill-current" />
                        <Star className="h-3 w-3 fill-current" />
                        <Star className="h-3 w-3 fill-current" />
                        <Star className="h-3 w-3 fill-current" />
                        <Star className="h-3 w-3 fill-current" />
                    </div>
                    <span className="text-xs font-bold text-black uppercase tracking-wide mt-0.5">Loved by 500+ Doctors</span>
                </div>
            </motion.div>

        </div>

      </div>
    </section>
  );
}
