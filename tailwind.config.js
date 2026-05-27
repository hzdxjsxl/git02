/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1e3a5f",
          light: "#2d5a8a",
          dark: "#152a47",
        },
        gold: {
          DEFAULT: "#d4a574",
          light: "#e8c99a",
          dark: "#b8895a",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
