import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        graphite: "#F5F3EE",
        panel: "#FFFFFF",
        panel2: "#F0EEE7",
        line: "#E2DFD6",
        ink: "#1B1D22",
        muted: "#6B6F76",
        copper: "#C9A227",
        copperSoft: "#A9871F",
        signal: "#2C6E52",
      },
      fontFamily: {
        display: ["Newsreader", "Georgia", "serif"],
        sans: ["Inter", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
