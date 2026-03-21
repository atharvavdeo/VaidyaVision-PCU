'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import FullScreenMenu from './FullScreenMenu';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
    <FullScreenMenu isOpen={isMenuOpen} setIsOpen={setIsMenuOpen} />
    
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="absolute top-0 left-0 right-0 z-50 grid grid-cols-[1fr_auto_1fr] items-center px-6 py-8 md:px-12 pointer-events-none"
    >
        {/* Brand - Left */}
        <div className="flex items-center gap-2 justify-self-start pointer-events-auto">
            <div className="h-3 w-3 rounded-full bg-black animate-pulse z-50" />
            <span className={`text-xl font-bold tracking-tight transition-colors duration-500 z-50 ${isMenuOpen ? 'text-white' : 'text-black'}`}>VaidyaVision</span>
        </div>

        {/* Links - Center Pill - Only visible when menu is CLOSED */}
        <div className="flex justify-center h-14"> {/* Fixed height to maintain layout when AnimatePresence removes item */}
            <AnimatePresence>
            {!isMenuOpen && (
                <motion.nav 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="hidden md:flex items-center gap-2 rounded-full bg-white/50 backdrop-blur-md shadow-sm border border-transparent hover:bg-white hover:border-black/5 hover:shadow-xl transition-all duration-500 ease-out px-4 py-3 pointer-events-auto"
                >
                <Link href="#about" className="px-6 py-3 text-sm font-bold text-black rounded-full transition-all duration-300 hover:bg-black hover:text-white hover:shadow-lg">
                    About Us
                </Link>
                <Link href="#cases" className="relative px-6 py-3 text-sm font-bold text-black rounded-full transition-all duration-300 hover:bg-black hover:text-white hover:shadow-lg">
                    Cases
                </Link>
                <Link href="#reviews" className="px-6 py-3 text-sm font-bold text-black rounded-full transition-all duration-300 hover:bg-black hover:text-white hover:shadow-lg">
                    Reviews
                </Link>
                <Link href="#contact" className="px-6 py-3 text-sm font-bold text-black rounded-full transition-all duration-300 hover:bg-black hover:text-white hover:shadow-lg">
                    Contact Us
                </Link>
                </motion.nav>
            )}
            </AnimatePresence>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-6 justify-self-end pointer-events-auto z-50">
            {!isMenuOpen && (
                <Link 
                  href="/sign-in" 
                  className="hidden lg:flex relative overflow-hidden group items-center gap-2 px-6 py-3 rounded-full bg-[#f0f0f0] border border-transparent hover:border-black transition-colors duration-300 text-sm font-bold"
                >
                    {/* Swipe Animation Background */}
                    <span className="absolute inset-0 bg-black w-0 group-hover:w-full transition-[width] duration-500 ease-out origin-left" />
                    
                    {/* Text Content */}
                    <span className="relative z-10 flex items-center gap-2 text-black group-hover:text-[#ccff00] transition-colors duration-300">
                        <span className="text-lg leading-none mb-0.5">+</span>
                        Become a Client
                    </span>
                </Link>
            )}
            
            <div className={`relative group hidden md:flex items-center gap-1 font-bold text-sm px-2 cursor-pointer ${isMenuOpen ? 'text-white' : 'text-black'}`}>
                <div className="flex items-center gap-1">
                    EN
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
                
                {/* Dropdown */}
                {!isMenuOpen && (
                    <div className="absolute top-full right-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
                        <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden w-24 py-1">
                            <div className="px-4 py-2 hover:bg-black hover:text-[#ccff00] text-black transition-colors text-sm">EN</div>
                            <div className="px-4 py-2 hover:bg-black hover:text-[#ccff00] text-black transition-colors text-sm">MR</div>
                        </div>
                    </div>
                )}
            </div>

             {/* Menu Toggle */}
             <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`relative h-10 w-10 flex items-center justify-center rounded-full transition-colors ${isMenuOpen ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'}`}
             >
                <div className="flex flex-col gap-1.5 items-end">
                    <motion.span 
                        animate={{ rotate: isMenuOpen ? 45 : 0, y: isMenuOpen ? 5 : 0 }} 
                        className={`h-0.5 w-6 block transition-colors duration-300 ${isMenuOpen ? 'bg-white' : 'bg-black'}`}
                    />
                    <motion.span 
                        animate={{ rotate: isMenuOpen ? -45 : 0, y: isMenuOpen ? -5 : 0, width: isMenuOpen ? 24 : 16 }} 
                        className={`h-0.5 block transition-all duration-300 ${isMenuOpen ? 'bg-white' : 'bg-black'}`}
                        style={{ width: isMenuOpen ? 24 : 16 }}
                    />
                </div>
            </button>
        </div>

    </motion.header>
    </>
  );
}
