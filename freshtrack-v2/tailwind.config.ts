import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        frost: {
          50: "#f0f9ff", 100: "#e0f2fe", 200: "#bae6fd", 300: "#7dd3fc",
          400: "#38bdf8", 500: "#0ea5e9", 600: "#0284c7", 700: "#0369a1",
          800: "#075985", 900: "#0c4a6e",
        },
        fresh: {
          50: "#f0fdf4", 100: "#dcfce7", 200: "#bbf7d0", 300: "#86efac",
          400: "#4ade80", 500: "#22c55e", 600: "#16a34a", 700: "#15803d",
          800: "#166534", 900: "#14532d",
        },
        warning: {
          50: "#fffbeb", 100: "#fef3c7", 200: "#fde68a", 300: "#fcd34d",
          400: "#fbbf24", 500: "#f59e0b", 600: "#d97706",
        },
        danger: {
          50: "#fef2f2", 100: "#fee2e2", 200: "#fecaca", 300: "#fca5a5",
          400: "#f87171", 500: "#ef4444", 600: "#dc2626",
        },
      },
      backdropBlur: {
        glass: "12px", "glass-heavy": "20px", "glass-light": "6px",
      },
      boxShadow: {
        glass: "0 2px 16px rgba(21,19,15,0.07), 0 1px 4px rgba(21,19,15,0.04)",
        "glass-hover": "0 8px 32px rgba(21,19,15,0.11), 0 2px 8px rgba(21,19,15,0.06)",
        "glass-inset": "inset 0 1px 0 rgba(255,248,232,0.7)",
        "glow-frost": "0 0 24px rgba(183,193,103,0.30), 0 0 8px rgba(183,193,103,0.16)",
        "glow-fresh": "0 0 24px rgba(34,197,94,0.20), 0 0 8px rgba(34,197,94,0.10)",
        "glow-danger": "0 0 24px rgba(184,50,30,0.26), 0 0 8px rgba(184,50,30,0.14)",
        "glow-warning": "0 0 24px rgba(245,158,11,0.20), 0 0 8px rgba(245,158,11,0.10)",
        "glow-white": "0 0 24px rgba(255,248,232,0.40)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out both",
        "fade-in-up": "fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in-down": "fadeInDown 0.4s cubic-bezier(0.16,1,0.3,1) both",
        "scale-in": "scaleIn 0.35s cubic-bezier(0.16,1,0.3,1) both",
        "slide-in-right": "slideInRight 0.4s cubic-bezier(0.16,1,0.3,1) both",
        "slide-in-left": "slideInLeft 0.4s cubic-bezier(0.16,1,0.3,1) both",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16,1,0.3,1) both",
        "slide-down": "slideDown 0.35s cubic-bezier(0.16,1,0.3,1) both",
        "pulse-glow": "pulseGlow 2.5s ease-in-out infinite",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        float: "float 3s ease-in-out infinite",
        "spin-slow": "spin 3s linear infinite",
        "bounce-subtle": "bounceSubtle 1s ease-in-out infinite",
        "scan-line": "scanLine 2s ease-in-out infinite",
        "page-enter": "pageEnter 0.5s cubic-bezier(0.16,1,0.3,1) both",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        fadeInUp: { "0%": { opacity: "0", transform: "translateY(20px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        fadeInDown: { "0%": { opacity: "0", transform: "translateY(-16px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        scaleIn: { "0%": { opacity: "0", transform: "scale(0.94)" }, "100%": { opacity: "1", transform: "scale(1)" } },
        slideInRight: { "0%": { opacity: "0", transform: "translateX(24px)" }, "100%": { opacity: "1", transform: "translateX(0)" } },
        slideInLeft: { "0%": { opacity: "0", transform: "translateX(-24px)" }, "100%": { opacity: "1", transform: "translateX(0)" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(32px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        slideDown: { "0%": { opacity: "0", transform: "translateY(-8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        pulseGlow: { "0%,100%": { boxShadow: "0 0 12px rgba(14,165,233,0.20)" }, "50%": { boxShadow: "0 0 28px rgba(14,165,233,0.45)" } },
        pulseSoft: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.65" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        float: { "0%,100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-6px)" } },
        bounceSubtle: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-4px)" } },
        scanLine: { "0%": { top: "8px", opacity: "0.8" }, "50%": { opacity: "1" }, "100%": { top: "calc(100% - 8px)", opacity: "0.8" } },
        pageEnter: { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
      backgroundImage: {
        "mesh-gradient": "radial-gradient(at 20% 10%, rgba(186,230,253,0.5) 0px, transparent 50%), radial-gradient(at 80% 20%, rgba(187,247,208,0.4) 0px, transparent 50%)",
        "glass-shimmer": "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)",
        "frost-gradient": "linear-gradient(135deg, #e0f2fe 0%, #f0fdf4 50%, #f0f9ff 100%)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.16,1,0.3,1)",
        "out-expo": "cubic-bezier(0.19,1,0.22,1)",
      },
      fontFamily: {
        sans: ["DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Lora", "Georgia", "Times New Roman", "serif"],
        mono: ["DM Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
