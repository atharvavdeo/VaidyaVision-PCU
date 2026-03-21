'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Github, Star, Instagram, Linkedin, Twitter, Divide } from 'lucide-react';

export default function FullScreenMenu({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (open: boolean) => void }) {
  const links = [
    { name: "Diagnostics", href: "#diagnostics", id: "01" },
    { name: "Radiology", href: "#radiology", id: "02" },
    { name: "AI Models", href: "#models", id: "03" },
    { name: "Patient Care", href: "#patients", id: "04" },
    { name: "Security", href: "#security", id: "05" },
    { name: "Analytics", href: "#analytics", id: "06" },
  ];

  return (
    <div className={`fixed inset-0 z-40 pointer-events-none ${isOpen ? 'pointer-events-auto' : ''}`}>
      {/* Left Panel - Slides from Top */}
      <motion.div
        initial={{ y: "-100%" }}
        animate={{ y: isOpen ? 0 : "-100%" }}
        transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
        className="absolute left-0 top-0 w-full lg:w-[35%] h-full bg-[#0a3820] flex flex-col justify-end p-8 pb-12 lg:p-12 lg:pb-12"
      >
        {/* Reviews Widget (Compensated) - Positioned at Bottom Left */}
        <div className="mb-0">
            <div className="flex items-center gap-1 mb-2">
                <div className="flex -space-x-3">
                    {[1,2,3].map(i => (
                        <div key={i} className="h-10 w-10 rounded-full border-2 border-[#0a3820] bg-gray-200" />
                    ))}
                    <div className="h-10 w-10 rounded-full bg-[#00ff99] text-[#0a3820] flex items-center justify-center text-xs border-2 border-[#0a3820] font-bold z-10">
                        10k+
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2 mb-1">
                <div className="h-8 w-8 rounded-full bg-white text-[#0a3820] flex items-center justify-center font-bold text-lg">V</div>
                <div className="flex text-[#00ff99]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
            </div>
            <p className="text-gray-400 text-xs max-w-[200px]">
                Awesome design for awesome businesses. Gold Verified.
            </p>
        </div>
      </motion.div>

      {/* Right Panel - Slides from Bottom */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: isOpen ? 0 : "100%" }}
        transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
        className="absolute right-0 top-0 w-full lg:w-[65%] h-full bg-[#0d4a2a] flex flex-col p-8 pt-32 lg:p-16 lg:pt-32"
      >
        <div className="flex h-full flex-col justify-between">
            {/* Nav Label */}
            <span className="text-white/50 text-sm font-medium">Navigation</span>

            {/* Menu Links */}
            <div className="flex flex-col gap-2 lg:gap-4 my-auto">
                {links.map((link) => (
                <Link 
                    key={link.name} 
                    href={link.href} 
                    onClick={() => setIsOpen(false)}
                    className="group flex items-start gap-4 text-white hover:text-[#00ff99] transition-colors"
                >
                    <span className="text-[5vw] lg:text-[4vw] font-bold leading-none font-['Aeonik','Inter',sans-serif]">
                    {link.name}
                    </span>
                    <span className="text-sm text-white/50 pt-2 lg:pt-4">{link.id}</span>
                </Link>
                ))}
            </div>

            {/* Footer */}
            <div className="flex items-end justify-between border-t border-white/10 pt-8">
                <div className="flex flex-col gap-2">
                    <h3 className="text-xl font-bold text-white">GitHub</h3>
                    <a href="https://github.com/atharvavdeo" className="text-white/70 hover:text-[#00ff99] underline decoration-1 underline-offset-4 text-sm">
                        @atharvavdeo/VaidyaVision
                    </a>
                </div>
                
                <div className="flex flex-col gap-4 items-end">
                    <div className="flex gap-4">
                        <Link href="https://github.com/atharvavdeo" className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-[#00ff99] hover:text-[#0a3820] transition-colors">
                            <Github className="h-5 w-5" />
                        </Link>
                        <Link href="#" className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-[#00ff99] hover:text-[#0a3820] transition-colors">
                            <Instagram className="h-5 w-5" />
                        </Link>
                         <Link href="#" className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-[#00ff99] hover:text-[#0a3820] transition-colors">
                            {/* Telegram Icon Mock - using Send for now */}
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </Link>
                        <Link href="#" className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-[#00ff99] hover:text-[#0a3820] transition-colors">
                            <Twitter className="h-5 w-5" />
                        </Link>
                        <Link href="#" className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-[#00ff99] hover:text-[#0a3820] transition-colors">
                            <Linkedin className="h-5 w-5" />
                        </Link>
                        <button className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-[#00ff99] hover:text-[#0a3820] transition-colors">
                            <span className="font-bold">V</span>
                        </button>
                    </div>
                    <div className="flex flex-col items-end text-xs text-white/50">
                        <p>Privacy Policy & Cookies</p>
                        <p>© VaidyaVision 2026</p>
                    </div>
                </div>
            </div>
        </div>
      </motion.div>
    </div>
  );
}
