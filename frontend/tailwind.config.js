/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Playfair Display'", "Georgia", "serif"],
        body: ["'DM Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        ink: {
          50:  "#f5f0eb",
          100: "#e8ddd2",
          200: "#d0bba5",
          300: "#b89878",
          400: "#9a7352",
          500: "#7c5a3a",
          600: "#5e4229",
          700: "#3f2c1a",
          800: "#21160d",
          900: "#100b06",
        },
        parchment: {
          50:  "#fdf9f3",
          100: "#f9f0e0",
          200: "#f2dfc0",
          300: "#e8c99a",
          400: "#dbb174",
          500: "#cc9650",
        },
        accent: {
          400: "#e8845c",
          500: "#d4623a",
          600: "#b84d28",
        },
        teal: {
          400: "#4ecdc4",
          500: "#3bb8b0",
          600: "#2a9d96",
        }
      },
      backgroundImage: {
        "paper-texture": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
      animation: {
        "fade-up":    "fadeUp 0.5s ease forwards",
        "fade-in":    "fadeIn 0.4s ease forwards",
        "shimmer":    "shimmer 1.8s infinite",
        "pulse-slow": "pulse 3s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: 0, transform: "translateY(16px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity: 0 },
          "100%": { opacity: 1 },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-700px 0" },
          "100%": { backgroundPosition: "700px 0" },
        },
      },
      boxShadow: {
        book: "4px 4px 0px 0px rgba(60,40,20,0.15), 8px 8px 24px rgba(60,40,20,0.10)",
        "book-hover": "6px 6px 0px 0px rgba(60,40,20,0.2), 12px 12px 32px rgba(60,40,20,0.15)",
        card: "0 2px 12px rgba(60,40,20,0.08), 0 1px 3px rgba(60,40,20,0.06)",
      },
    },
  },
  plugins: [],
};
