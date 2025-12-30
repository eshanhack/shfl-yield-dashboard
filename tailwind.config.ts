import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          black: "#000000",
          dark: "#0a0a0a",
          card: "#0d0d0d",
          border: "#1f1f1f",
          accent: "#FF5500",
          accentHover: "#FF6B1A",
          accentDim: "#CC4400",
          accentGlow: "rgba(255, 85, 0, 0.4)",
          text: "#FFFFFF",
          textSecondary: "#B0B0B0",
          textMuted: "#707070",
          positive: "#00E676",
          negative: "#FF5252",
          warning: "#FFC400",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Roboto Mono", "Consolas", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(255, 85, 0, 0.3)",
        "glow-sm": "0 0 10px rgba(255, 85, 0, 0.2)",
        "glow-lg": "0 0 40px rgba(255, 85, 0, 0.4)",
      },
      animation: {
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        glow: "glow 2s ease-in-out infinite alternate",
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        ticker: "ticker 0.3s ease-out",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(255, 85, 0, 0.2)" },
          "100%": { boxShadow: "0 0 20px rgba(255, 85, 0, 0.6)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        ticker: {
          "0%": { opacity: "0.5", transform: "scale(1.02)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

