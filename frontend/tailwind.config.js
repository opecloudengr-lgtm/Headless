/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        wine: {
          50: "#fbf1f2",
          100: "#f5e0e3",
          200: "#eabec5",
          300: "#d996a1",
          400: "#c26576",
          500: "#a63f52",
          600: "#8c2f40",
          700: "#722f37",
          800: "#5c1f2a",
          850: "#4a1622",
          900: "#380f19",
          950: "#23090f",
        },
        gold: {
          400: "#e0bb62",
          500: "#c9a227",
          600: "#a8841c",
        },
      },
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        wine: "0 12px 30px -10px rgba(56, 15, 25, 0.45)",
      },
      backgroundImage: {
        "wine-gradient": "linear-gradient(135deg, #4a1622 0%, #722f37 55%, #8c2f40 100%)",
        "wine-mesh":
          "radial-gradient(60% 50% at 15% 20%, rgba(224,187,98,0.20) 0%, rgba(224,187,98,0) 60%), radial-gradient(55% 45% at 85% 15%, rgba(140,47,64,0.55) 0%, rgba(140,47,64,0) 60%), linear-gradient(160deg, #2c0d16 0%, #4a1622 45%, #722f37 100%)",
      },
      keyframes: {
        blob: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(4%, -6%) scale(1.08)" },
          "66%": { transform: "translate(-3%, 4%) scale(0.95)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        blob: "blob 14s ease-in-out infinite",
        "fade-up": "fade-up 0.6s ease-out both",
      },
    },
  },
  plugins: [],
};
