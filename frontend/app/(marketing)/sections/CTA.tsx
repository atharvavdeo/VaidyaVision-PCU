'use client';

import { motion } from 'framer-motion';

function BackgroundMarquee() {
  return (
    <div className="absolute inset-0 z-0 flex flex-col justify-center opacity-30 pointer-events-none select-none overflow-hidden">
        {/* Row 1 moving Right */}
        <motion.div 
            className="flex gap-8 mb-8"
            animate={{ x: ["-10%", "-50%"] }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        >
            {[...Array(12)].map((_, i) => (
                <div key={`r1-${i}`} className="h-64 w-40 rounded-[2rem] border-[1.5px] border-[#d1d5db] shrink-0 bg-white/20 backdrop-blur-sm" />
            ))}
        </motion.div>
    </div>
  )
}

export default function CTASection() {
    return (
        <section className="w-full px-6 md:px-32 lg:px-48 xl:px-64 pb-24 pt-12 bg-white">
            <div className="relative w-full min-h-[60vh] h-auto bg-[#fffaf5] rounded-[3rem] overflow-hidden flex flex-col items-center justify-center text-center p-12 md:p-20 shadow-sm border border-black/5">
                
                {/* Moving Background */}
                <BackgroundMarquee />
                
                {/* Content */}
                <div className="relative z-10 max-w-5xl mx-auto font-medium text-[#1a202c]">
                    <div className="text-[7vw] md:text-[5vw] leading-[1.1] tracking-tight font-['Neue_Montreal','Helvetica',sans-serif]">
                        
                        <div className="flex flex-wrap items-center justify-center gap-x-4 md:gap-x-6">
                            <span>Diagnostic</span>
                            <span>errors</span>
                            <span>cost</span>
                            <span className="text-[#ff4d4d]">lives,</span>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-x-3 md:gap-x-5 mt-2 md:mt-4">
                            <span>so</span>
                            <span>we</span>
                            <span>use</span>
                            
                            {/* Pill 1 */}
                            <div className="inline-flex items-center justify-center align-middle mx-1">
                                <span className="h-[1.2em] w-[2.5em] rounded-full bg-black/5 overflow-hidden relative border border-black/10 flex items-center justify-center">
                                     {/* Abstract Green Medical Pattern */}
                                     <div className="absolute inset-0 bg-[#0a3820] opacity-10" />
                                     <div className="h-full w-full flex items-center justify-center gap-0.5 opacity-50">
                                         <div className="h-[60%] w-[2px] bg-[#00ff99]" />
                                         <div className="h-[40%] w-[2px] bg-[#00ff99]" />
                                         <div className="h-[70%] w-[2px] bg-[#00ff99]" />
                                     </div>
                                </span>
                            </div>

                            <span>Visual</span>
                            <span>Evidence</span>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-x-3 md:gap-x-5 mt-2 md:mt-4">
                            <span>to</span>
                            <span>ensure</span>
                            <span>Clinical</span>
                            
                            {/* Pill 2 */}
                             <div className="inline-flex items-center justify-center align-middle mx-1">
                                <span className="h-[1.2em] w-[2.5em] rounded-full bg-black/5 overflow-hidden relative border border-black/10 flex items-center justify-center">
                                     {/* Abstract Blue Data Pattern */}
                                      <div className="absolute inset-0 bg-[#00ff99] opacity-20" />
                                      <svg className="w-[60%] h-[60%] text-[#0a3820]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                                      </svg>
                                </span>
                            </div>

                            <span className="text-[#0a3820]">Trust.</span>
                        </div>

                    </div>
                    
                    <p className="mt-8 text-lg text-black/40 font-medium max-w-xl mx-auto">
                        Join the 500+ healthcare institutions using VaidyaVision to reduce misdiagnosis and automate reporting.
                    </p>
                </div>
                
            </div>
        </section>
    )
}
