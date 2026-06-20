import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#f7f8fa",
        ink: "#17202a",
        muted: "#657285",
        line: "#d9dee7",
        accent: "#1f6feb",
        success: "#1f8f5f",
        warning: "#b7791f",
        danger: "#b42318",
      },
      boxShadow: {
        panel: "0 1px 2px rgba(16, 24, 40, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
