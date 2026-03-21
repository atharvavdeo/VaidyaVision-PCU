import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        // Medical / Emerald Green Theme
        medical: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        vaidya: {
          50: '#f0fdf4',
          500: '#10b981',
          600: '#059669',
          900: '#064e3b',
        },

        // VaidyaVision UI Theme (Olive/Sage/Cream)
        cream: {
          50: "#F9F9F0", // Main BG
          100: "#F3F3E8", // Card BG Light
          200: "#EAEFE6",
        },
        olive: {
          700: "#3E4F2B",
          800: "#2D3A1E", // Primary Dark
          900: "#1A2311",
        },
        sage: {
          200: "#E2E8D5", // Light Accents / Cards
          300: "#D9E5D6",
          400: "#B5C99A", // Mid Accents
          500: "#A3B18A", // Charts / Active
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Inter", "sans-serif"], // Bold headings
      },
    },
  },
  plugins: [],
};
export default config;
