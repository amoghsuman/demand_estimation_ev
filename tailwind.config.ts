import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        graphite: "#10131A",
        panel: "#171B24",
        panel2: "#1D2230",
        line: "#2B303B",
        ink: "#E8E9ED",
        muted: "#8891A0",
        copper: "#B8834B",
        copperSoft: "#8C6A42",
        signal: "#5FD0C0",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Inter", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
