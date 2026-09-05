import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F6F8FA",
        surface: "#FFFFFF",
        line: "#DCE3EA",
        "line-strong": "#C3CDD8",
        ink: "#0F2438",
        "ink-2": "#4F6072",
        "ink-3": "#64748B",
        accent: { DEFAULT: "#1F8A82", hover: "#186D66", soft: "#E4F1EF", ink: "#12615B" },
        viz: { teal: "#5FA9AC", gold: "#E3B34E", coral: "#D98A94", purple: "#B99BD1", beige: "#D8CEC2" },
        up: { DEFAULT: "#1B7F4F", soft: "#E6F4EC", ink: "#0F5A36" },
        down: { DEFAULT: "#C42B2B", soft: "#FBE9E9", ink: "#8A1C1C" },
        note: { soft: "#FFF6E0", ink: "#7A5200" },
        hairline: "rgba(15,36,56,0.06)",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,36,56,0.05)",
        ambient: "0 1px 2px 0 rgba(15,36,56,0.04), 0 4px 12px -2px rgba(15,36,56,0.06)",
        "ambient-md": "0 2px 4px -1px rgba(15,36,56,0.05), 0 10px 28px -6px rgba(15,36,56,0.11)",
        "ambient-lg": "0 4px 8px -2px rgba(15,36,56,0.06), 0 18px 44px -10px rgba(15,36,56,0.16)",
        raised: "0 10px 28px -6px rgba(15,36,56,0.14)",
      },
      borderRadius: { md: "8px", lg: "12px" },
    },
  },
  plugins: [],
};
export default config;
