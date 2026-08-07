import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["src/**/*.{ts,tsx,css}"],
  theme: {
    extend: {
      fontFamily: {
        // Le design SaaS utilise souvent Inter ou Geist pour ce look "Apple"
        sans: ["Inter", "var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        // COULEURS DE RÉFÉRENCE "SCHOOL TECH"
        border: "rgba(255, 255, 255, 0.1)", // Bordures fines et translucides
        input: "rgba(255, 255, 255, 0.05)",
        ring: "#10b981", // Le vert émeraude pour les focus
        background: "#020817", // Le bleu nuit très profond de l'image
        foreground: "#f8fafc",
        primary: {
          DEFAULT: "#10b981", // Vert Émeraude (Emerald 500)
          foreground: "#ffffff",
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
        secondary: {
          DEFAULT: "#0f172a", // Bleu ardoise foncé
          foreground: "#f8fafc"
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#f8fafc"
        },
        muted: {
          DEFAULT: "#1e293b", // Couleur pour les textes secondaires
          foreground: "#94a3b8"
        },
        accent: {
          DEFAULT: "rgba(16, 185, 129, 0.1)", // Reflet vert léger
          foreground: "#10b981"
        },
        popover: {
          DEFAULT: "#020817",
          foreground: "#f8fafc"
        },
        card: {
          // L'effet translucide des cartes sur l'image
          DEFAULT: "rgba(15, 23, 42, 0.4)", 
          foreground: "#f8fafc"
        },
      },
      borderRadius: {
        "4xl": "2rem",      // 32px
        "5xl": "2.5rem",    // 40px (Arrondi des grandes cartes de l'image)
        "6xl": "3rem",      // 48px
        lg: "1rem",         // Radius standard plus grand
        md: "0.75rem",
        sm: "0.5rem"
      },
      boxShadow: {
        // Les ombres portées de l'image sont douces et larges
        "soft": "0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)",
        "premium": "0 20px 50px rgba(0, 0, 0, 0.5)",
        "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.37)", // Ombre spéciale pour effet verre
        "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" }, // Flottement plus prononcé
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float": "float 4s ease-in-out infinite",
        "pulse-slow": "pulse-slow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;