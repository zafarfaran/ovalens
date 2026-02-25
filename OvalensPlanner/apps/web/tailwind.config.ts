import type { Config } from "tailwindcss";
import preset from "@helio/config/tailwind/preset";

const config: Config = {
  presets: [preset],
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-outfit)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 0.5s ease-out both",
        "slide-left": "slide-in-left 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-right":
          "slide-in-right 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        float: "float 3s ease-in-out infinite",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "spin-slow": "spin 8s linear infinite",
        "gradient-x": "gradient-x 6s ease infinite",
      },
      keyframes: {
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
