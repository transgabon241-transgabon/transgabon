import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["src/**/*.{ts,tsx,css}"],
  theme: {
    extend: {
      fontFamily: {
        // Inter est parfait, Geist (de Vercel) est aussi une excellente alternative pour ce look
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        border: "rgba(255, 255, 255, 0.1)", 
        input: "rgba(255, 255, 255, 0.05)",
        ring: "#10b981", 
        background: "#020617", // Un poil plus sombre pour faire ressortir le vert
        foreground: "#f8fafc",
        primary: {
          DEFAULT: "#10b981", // Le vert émeraude School Tech
          foreground: "#ffffff",
          hover: "#059669",
          "surface": "rgba(16, 185, 129, 0.1)", // Pour les badges avec fond vert translucide
        },
        // Couleur spécifique pour les fonds de section Transgabon
        navy: {
          900: "#020617",
          800: "#0f172a",
          700: "#1e293b",
        },
        secondary: {
          DEFAULT: "rgba(30, 41, 59, 0.5)", // Utilisé pour les cartes en mode verre
          foreground: "#f8fafc"
        },
        accent: {
          DEFAULT: "#38bdf8", // Un bleu ciel léger (utilisé discrètement dans certains reflets)
          foreground: "#0f172a"
        },
        card: {
          DEFAULT: "rgba(15, 23, 42, 0.6)", // L'effet de transparence exact du dashboard SIKOLO
          foreground: "#f8fafc",
          border: "rgba(255, 255, 255, 0.08)"
        },
      },
      borderRadius: {
        "3xl": "1.5rem",
        "4xl": "2rem",      
        "5xl": "2.5rem",    
        "pill": "9999px",
      },
      backgroundImage: {
        // Le dégradé signature que l'on voit sur le Hero et le Footer
        "hero-gradient": "radial-gradient(circle at top right, rgba(16, 185, 129, 0.15), transparent 40%), radial-gradient(circle at bottom left, rgba(16, 185, 129, 0.05), transparent 40%)",
        "glass-gradient": "linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.03))",
      },
      boxShadow: {
        "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.4)",
        "emerald-glow": "0 0 20px rgba(16, 185, 129, 0.2)", // Pour faire briller les boutons verts
      },
      animation: {
        "float": "float 6s ease-in-out infinite",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-15px)" },
        }
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;