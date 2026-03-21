'use client';

import { motion } from "framer-motion";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-[#9BCF53] via-white to-[#e6ffe6]">
      
      {/* Animated Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(155,207,83,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      {/* Gradient Overlay Circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-[#9BCF53]/40 to-white/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute bottom-1/4 right-1/4 w-[700px] h-[700px] bg-gradient-to-tl from-white/40 to-[#9BCF53]/30 rounded-full blur-3xl"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        
        {/* Glassmorphic Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative group"
        >
          {/* Glow Effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[#9BCF53] via-white to-[#9BCF53] rounded-[4rem] opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-500" />
          
          {/* Main Card */}
          <div className="relative bg-white/30 backdrop-blur-2xl rounded-[4rem] p-12 md:p-20 border border-white/40 shadow-2xl">
            
            {/* 404 3D Text Effect */}
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, type: "spring" }}
              className="relative"
            >
              {/* Shadow layers for 3D effect */}
              <div className="absolute inset-0 translate-x-2 translate-y-2 blur-sm">
                <h1 className="text-[12rem] md:text-[18rem] font-black text-black/20 leading-none select-none">
                  404
                </h1>
              </div>
              <div className="absolute inset-0 translate-x-1 translate-y-1">
                <h1 className="text-[12rem] md:text-[18rem] font-black text-black/40 leading-none select-none">
                  404
                </h1>
              </div>
              
              {/* Main Text */}
              <h1 className="relative text-[12rem] md:text-[18rem] font-black bg-gradient-to-br from-black via-gray-800 to-[#9BCF53] bg-clip-text text-transparent leading-none select-none">
                404
              </h1>
            </motion.div>

            {/* Subtitle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center mt-8 space-y-4"
            >
              <h2 className="text-3xl md:text-5xl font-bold text-black">
                Page Not Found
              </h2>
              <p className="text-lg md:text-xl text-gray-700 font-medium max-w-md mx-auto">
                The page you're looking for doesn't exist or has been moved.
              </p>
            </motion.div>

            {/* Action Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-12 flex justify-center"
            >
              <Link 
                href="/"
                className="group/btn relative overflow-hidden px-8 py-4 rounded-full bg-black border-2 border-transparent hover:border-[#ccff00] transition-all duration-300"
              >
                <span className="absolute inset-0 bg-[#ccff00] w-0 group-hover/btn:w-full transition-[width] duration-500 ease-out origin-left" />
                <span className="relative z-10 flex items-center gap-2 text-white group-hover/btn:text-black font-bold text-lg transition-colors duration-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Home
                </span>
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Brand Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-12 flex items-center gap-2"
        >
          <div className="h-3 w-3 rounded-full bg-black animate-pulse" />
          <span className="text-xl font-bold text-black">VaidyaVision</span>
        </motion.div>
      </div>
    </div>
  );
}
