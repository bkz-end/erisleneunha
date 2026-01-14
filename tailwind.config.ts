import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta luxuosa e sofisticada
        luxury: {
          gold: "#D4AF37",
          "gold-light": "#F4E4BC",
          "gold-dark": "#B8960C",
          champagne: "#F7E7CE",
          pearl: "#FDFBF7",
          ivory: "#FFFFF0",
        },
        pastel: {
          pink: "#FDF2F8",
          rose: "#FCE7F3",
          blush: "#FFF1F2",
          cream: "#FFFBEB",
          lavender: "#F5F3FF",
          peach: "#FFF7ED",
        },
        rose: {
          gold: "#B76E79",
          "gold-light": "#E8B4B8",
          "gold-dark": "#8B4D57",
          "gold-muted": "#C9A0A5",
        },
        neutral: {
          soft: "#FAFAF9",
          warm: "#F5F5F4",
          elegant: "#E7E5E4",
        },
        accent: {
          burgundy: "#722F37",
          wine: "#5C1A1B",
          mauve: "#E0B0FF",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-playfair)", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 4px 20px -2px rgba(183, 110, 121, 0.08), 0 2px 8px -2px rgba(183, 110, 121, 0.06)",
        glow: "0 0 30px rgba(183, 110, 121, 0.2)",
        "glow-gold": "0 0 40px rgba(212, 175, 55, 0.15)",
        luxury: "0 25px 50px -12px rgba(0, 0, 0, 0.08)",
        elegant: "0 10px 40px -10px rgba(183, 110, 121, 0.12)",
      },
      backgroundImage: {
        "gradient-luxury": "linear-gradient(135deg, #FDF2F8 0%, #FFFBEB 50%, #FFF1F2 100%)",
        "gradient-gold": "linear-gradient(135deg, #D4AF37 0%, #F4E4BC 50%, #D4AF37 100%)",
        "gradient-rose": "linear-gradient(135deg, #B76E79 0%, #E8B4B8 50%, #B76E79 100%)",
        "shimmer": "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
      },
      animation: {
        "shimmer": "shimmer 2s infinite",
        "float": "float 3s ease-in-out infinite",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};

export default config;
