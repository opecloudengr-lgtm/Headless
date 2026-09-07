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
      },
    },
  },
  plugins: [],
};
