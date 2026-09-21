import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          light: "#dfc18d",
          DEFAULT: "#c8a96e",
          dark: "#8b5e2a",
          deep: "#68431b",
        },
        sand: {
          50: "#fdfbf7",
          100: "#faf6ee",
          200: "#f3ebd8",
          300: "#e6d7b8",
        },
        surface: {
          DEFAULT: "#ffffff",
          subtle: "#fafaf8",
          card: "#ffffff",
          dark: "#121214",
          "dark-subtle": "#18181b",
          "dark-card": "#1c1c20",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        serif: ["var(--font-serif)", "Playfair Display", "Georgia", "serif"],
        hindi: ["var(--font-hindi)", "Noto Sans Devanagari", "Plus Jakarta Sans", "sans-serif"],
        "hindi-heading": ["var(--font-hindi-heading)", "Rozha One", "Noto Serif Devanagari", "serif"],
      },
      boxShadow: {
        luxury: "0 10px 30px -10px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        card: "0 2px 12px -2px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)",
        "card-dark": "0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 2px 6px rgba(0, 0, 0, 0.3)",
        glow: "0 0 25px rgba(200, 169, 110, 0.35)",
        "glow-dark": "0 0 25px rgba(255, 255, 255, 0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
