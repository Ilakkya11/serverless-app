import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefbf3",
          100: "#d7f5e2",
          500: "#23a36d",
          700: "#187450",
          900: "#0e4530"
        }
      },
      fontFamily: {
        display: ["Poppins", "ui-sans-serif", "system-ui"],
        body: ["Manrope", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        glow: "0 20px 60px rgba(35, 163, 109, 0.18)"
      }
    }
  },
  plugins: []
} satisfies Config;
