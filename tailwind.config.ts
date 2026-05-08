import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "SF Pro Text", "Inter", "Segoe UI", "Arial", "sans-serif"]
      },
      colors: {
        background: "#F5F5F7",
        foreground: "#1D1D1F",
        muted: "#6E6E73",
        primary: "#007AFF",
        success: "#34C759",
        warning: "#FF9500",
        danger: "#FF3B30",
        cinema: {
          black: "#FBFBFD",
          graphite: "#FFFFFF",
          wine: "#EEF3FF",
          amber: "#007AFF",
          gold: "#0A84FF",
          cream: "#6E6E73"
        }
      },
      boxShadow: {
        glow: "0 0 60px rgba(0, 122, 255, 0.16)",
        panel: "0 12px 40px rgba(0, 0, 0, 0.06)",
        soft: "0 12px 40px rgba(0, 0, 0, 0.06)",
        floating: "0 20px 60px rgba(0, 0, 0, 0.10)"
      },
      backgroundImage: {
        "cinema-radial": "radial-gradient(circle at 20% 10%, rgba(0, 122, 255, 0.12), transparent 30%), radial-gradient(circle at 80% 12%, rgba(52, 199, 89, 0.08), transparent 28%), linear-gradient(135deg, #FBFBFD 0%, #F5F5F7 100%)"
      }
    }
  },
  plugins: []
};

export default config;
