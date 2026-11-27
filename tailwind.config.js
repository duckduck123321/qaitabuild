/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#244D3C", dark: "#1A3A2D", light: "#2F6650" },
        sage: { DEFAULT: "#A8C7A0", light: "#DCE9D8" },
        bg: "#F7F8F5",
        ink: { DEFAULT: "#292D2B", muted: "#6B716D", faint: "#9AA09C" },
        ai: { DEFAULT: "#E0A33B", light: "#FBF0DC", dark: "#9A6A16" },
        line: "#E4E7E2",
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
      borderRadius: { xl: "14px", "2xl": "20px" },
      boxShadow: { card: "0 1px 2px rgba(41,45,43,.04), 0 4px 16px rgba(41,45,43,.06)" },
    },
  },
  plugins: [],
};
