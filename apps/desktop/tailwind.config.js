/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // === SakeAnime Design System ===
        background: "#080B12",
        surface: "#11151D",
        card: "#181E28",
        "card-hover": "#1E2636",
        primary: "#FF6B8A",
        "primary-hover": "#FF8DA5",
        muted: "#A1A1AA",
        // Legacy tokens for compatibility
        "surface-container-low": "#0D1119",
        "surface-container": "#11151D",
        "surface-container-high": "#181E28",
        "surface-container-highest": "#1E2636",
        "outline-variant": "#2A2E3D",
        "on-surface": "#FFFFFF",
        "on-surface-variant": "#A1A1AA",
        "on-primary": "#FFFFFF",
        "primary-container": "#FF6B8A",
        "on-primary-container": "#FFFFFF",
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans JP", "sans-serif"],
        display: ["Shippori Mincho", "Noto Sans JP", "serif"],
      },
      borderColor: {
        DEFAULT: "rgba(255,255,255,0.08)",
      },
      spacing: {
        sm: "12px",
        md: "24px",
        base: "8px",
        "margin-desktop": "48px",
        lg: "48px",
        "margin-mobile": "16px",
        xl: "80px",
        xs: "4px"
      },
      fontSize: {
        "display-lg": ["48px", { lineHeight: "56px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "headline-lg-mobile": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "label-md": ["14px", { lineHeight: "20px", letterSpacing: "0.01em", fontWeight: "500" }],
        "label-sm": ["12px", { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "600" }],
      },
      boxShadow: {
        "primary-glow": "0 0 30px rgba(255, 107, 138, 0.3)",
        "card-hover": "0 8px 32px rgba(0,0,0,0.4)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      }
    },
  },
  plugins: [],
}
