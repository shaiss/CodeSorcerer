import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "dark-navy": "#0A192F",
        "deep-space": "#141E33",
        "cosmic-purple": "#1A1B3B",
        "electric-purple": "#9333EA",
        "neon-pink": "#EC4899",
        "aqua-blue": "#06B6D4",
        "neon-green": "#10B981",
      },
      backgroundImage: {
        "grid-pattern": "url('/grid-pattern.svg')",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in",
        "fade-in-delay": "fadeIn 0.5s ease-in 0.2s",
        "fade-in-delay-2": "fadeIn 0.5s ease-in 0.4s",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
