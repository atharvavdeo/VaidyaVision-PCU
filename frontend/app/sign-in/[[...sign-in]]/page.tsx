'use client';

import { SignIn } from "@clerk/nextjs";
import { motion } from "framer-motion";

export default function SignInPage() {
  return (
    <div className="min-h-screen w-full relative flex items-center justify-center bg-[#F6F8F3] overflow-hidden">
      
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 30, 0],
            y: [0, -20, 0],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-[#9BCF53] rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -20, 0],
            y: [0, 30, 0],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute -bottom-32 -left-32 w-[600px] h-[600px] bg-black rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.08, 0.15, 0.08],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-white rounded-full blur-3xl"
        />
      </div>

      {/* Content Container */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-lg px-6"
      >
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="h-2.5 w-2.5 rounded-full bg-[#9BCF53]"
            />
            <span className="text-3xl font-bold tracking-tight text-black">VaidyaVision</span>
          </div>
          <h1 className="text-4xl font-black text-black mb-3 leading-tight">Welcome Back</h1>
          <p className="text-gray-600 font-medium text-lg">Sign in to continue your medical journey</p>
        </motion.div>

        {/* Glassmorphism Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
          className="relative group"
        >
          {/* Enhanced Glow Effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[#9BCF53] via-white to-black rounded-[28px] opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-700" />
          
          {/* Main Card with Enhanced Glassmorphism */}
          <div className="relative bg-white/70 backdrop-blur-2xl rounded-3xl p-10 border-2 border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.2)] transition-all duration-700">
            <SignIn 
              routing="path"
              path="/sign-in"
              signUpUrl="/sign-up"
              redirectUrl="/onboarding"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "bg-transparent shadow-none",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  socialButtonsBlockButton: "bg-white/90 hover:bg-white border-2 border-gray-200 hover:border-[#9BCF53] text-black font-semibold transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow-md",
                  socialButtonsBlockButtonText: "font-semibold",
                  formButtonPrimary: "bg-black hover:bg-[#9BCF53] hover:text-black transition-all duration-300 font-bold text-base py-3 shadow-lg hover:shadow-xl hover:scale-[1.02]",
                  formFieldInput: "bg-white/80 backdrop-blur-sm border-2 border-gray-200 focus:border-[#9BCF53] focus:ring-4 focus:ring-[#9BCF53]/20 transition-all duration-300 text-black placeholder:text-gray-400",
                  formFieldLabel: "text-black font-semibold text-sm",
                  footerActionLink: "text-black hover:text-[#9BCF53] transition-colors font-bold underline decoration-2 underline-offset-4",
                  identityPreviewEditButton: "text-black hover:text-[#9BCF53] transition-colors",
                  formResendCodeLink: "text-black hover:text-[#9BCF53] font-semibold",
                  otpCodeFieldInput: "border-2 border-gray-200 focus:border-[#9BCF53] focus:ring-4 focus:ring-[#9BCF53]/20",
                  dividerLine: "bg-gray-300",
                  dividerText: "text-gray-500 font-medium",
                }
              }}
            />
          </div>
        </motion.div>

        {/* Footer Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-sm text-gray-600 mt-8 font-medium"
        >
          🔒 Powered by AI-driven diagnostics
        </motion.p>
      </motion.div>
    </div>
  );
}
