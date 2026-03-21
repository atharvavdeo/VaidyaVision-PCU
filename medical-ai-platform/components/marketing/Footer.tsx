'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Github, Linkedin, Instagram, Twitter } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full bg-black py-8 px-2 md:px-6 rounded-t-[3rem] mt-4"> 
        {/* Main Rounded Box */}
        <div className="relative w-full min-h-[500px] rounded-[3rem] bg-[#050505] overflow-hidden flex flex-col justify-between p-8 md:p-12 lg:p-16 border border-[#ccff00]/20">
            
            {/* Background Image (Better Visibility) */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-60 mix-blend-screen">
                <Image 
                    src="/images/footer-bg.png" 
                    alt="Footer Background" 
                    fill
                    className="object-cover"
                />
            </div>
            
             {/* Big Background Text (Brand) */}
            <div className="absolute bottom-[-5%] left-1/2 -translate-x-1/2 z-0 pointer-events-none select-none w-full text-center overflow-hidden">
                <h1 className="text-[18vw] leading-[0.8] font-black text-[#ccff00]/5 tracking-tighter font-['Druk_Wide','Arial_Black',sans-serif]">
                    VAIDYAVISION
                </h1>
            </div>

            {/* Top Section: Content */}
            <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-12 text-[#ccff00]">
                
                {/* Left: Tagline */}
                <div className="xl:col-span-4 flex flex-col justify-start">
                    <div className="group inline-block rounded-[2rem] bg-[#0d2a1f] p-8 border border-[#ccff00]/20 hover:bg-[#ccff00] transition-colors duration-300">
                        <h2 className="text-2xl md:text-3xl font-medium tracking-tight leading-snug max-w-md text-[#ccff00] group-hover:text-[#050505] transition-colors duration-300">
                            Built to assist clinicians with transparent, anatomy-aware medical image analysis.
                        </h2>
                    </div>
                </div>

                {/* Right: Links */}
                <div className="xl:col-span-8 grid grid-cols-2 lg:grid-cols-4 gap-8 text-sm">
                    
                    {/* Column 1: Company */}
                    <div className="flex flex-col gap-4">
                        <span className="font-semibold text-[#ccff00] opacity-50 uppercase tracking-wider text-xs">Company</span>
                        <Link href="/about" className="hover:text-white hover:translate-x-1 transition-all">About Us</Link>
                        <Link href="/careers" className="hover:text-white hover:translate-x-1 transition-all">Careers</Link>
                        <Link href="/contact" className="hover:text-white hover:translate-x-1 transition-all">Contact</Link>
                        <Link href="/press" className="hover:text-white hover:translate-x-1 transition-all">Press</Link>
                        <Link href="/partners" className="hover:text-white hover:translate-x-1 transition-all">Partnerships</Link>
                    </div>

                    {/* Column 2: Solutions */}
                    <div className="flex flex-col gap-4">
                        <span className="font-semibold text-[#ccff00] opacity-50 uppercase tracking-wider text-xs">Solutions</span>
                        <Link href="/doctors" className="hover:text-white hover:translate-x-1 transition-all">For Doctors</Link>
                        <Link href="/hospitals" className="hover:text-white hover:translate-x-1 transition-all">For Hospitals</Link>
                        <Link href="/researchers" className="hover:text-white hover:translate-x-1 transition-all">For Researchers</Link>
                        <Link href="/cases" className="hover:text-white hover:translate-x-1 transition-all">Clinical Use Cases</Link>
                        <Link href="/demo" className="hover:text-white hover:translate-x-1 transition-all">Demo Mode</Link>
                    </div>
                
                    {/* Column 3: Platform */}
                    <div className="flex flex-col gap-4">
                        <span className="font-semibold text-[#ccff00] opacity-50 uppercase tracking-wider text-xs">Platform</span>
                        <Link href="/how-it-works" className="hover:text-white hover:translate-x-1 transition-all">How It Works</Link>
                        <Link href="/architecture" className="hover:text-white hover:translate-x-1 transition-all">Architecture</Link>
                        <Link href="/explainability" className="hover:text-white hover:translate-x-1 transition-all">Explainability</Link>
                        <Link href="/security" className="hover:text-white hover:translate-x-1 transition-all">Security</Link>
                        <Link href="/pricing" className="hover:text-white hover:translate-x-1 transition-all">Pricing</Link>
                    </div>

                    {/* Column 4: Legal */}
                    <div className="flex flex-col gap-4">
                        <span className="font-semibold text-[#ccff00] opacity-50 uppercase tracking-wider text-xs">Legal</span>
                        <Link href="/privacy" className="hover:text-white hover:translate-x-1 transition-all">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-white hover:translate-x-1 transition-all">Terms of Service</Link>
                        <Link href="/data" className="hover:text-white hover:translate-x-1 transition-all">Data Protection</Link>
                        <Link href="/ai-policy" className="hover:text-white hover:translate-x-1 transition-all">Responsible AI</Link>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Copyright & Socials */}
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 pt-12 md:pt-24 mt-auto border-t border-[#ccff00]/20">
                
                <p className="text-[#ccff00]/60 text-sm font-medium">
                    © 2026 VaidyaVision. All rights reserved.
                </p>

                <div className="flex items-center gap-4">
                     <Link href="https://instagram.com" className="h-10 w-10 bg-black rounded-full flex items-center justify-center hover:bg-[#ccff00] group transition-colors border border-[#ccff00]/20">
                        <Instagram className="w-5 h-5 text-[#ccff00] group-hover:text-black transition-colors" />
                     </Link>
                     <Link href="https://linkedin.com" className="h-10 w-10 bg-black rounded-full flex items-center justify-center hover:bg-[#ccff00] group transition-colors border border-[#ccff00]/20">
                        <Linkedin className="w-5 h-5 text-[#ccff00] group-hover:text-black transition-colors" />
                     </Link>
                     <Link href="https://github.com" className="h-10 w-10 bg-black rounded-full flex items-center justify-center hover:bg-[#ccff00] group transition-colors border border-[#ccff00]/20">
                        <Github className="w-5 h-5 text-[#ccff00] group-hover:text-black transition-colors" />
                     </Link>
                     <Link href="https://twitter.com" className="h-10 w-10 bg-black rounded-full flex items-center justify-center hover:bg-[#ccff00] group transition-colors border border-[#ccff00]/20">
                        <Twitter className="w-5 h-5 text-[#ccff00] group-hover:text-black transition-colors" />
                     </Link>
                </div>

            </div>

        </div>
    </footer>
  )
}
