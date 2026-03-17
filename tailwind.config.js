export default {
  content: ["./index.html", "./src/**/*.{js,ts,vue}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        skin: {
          bg: "rgb(20, 19, 24)",
          "bg-alt": "rgb(28, 27, 32)",
          border: "rgb(43, 42, 47)",
          heading: "rgb(255, 255, 255)",
          text: "rgb(160, 159, 164)",
          link: "rgb(255, 255, 255)",
          primary: "rgb(255, 255, 255)",
          "accent-foreground": "rgb(17, 17, 17)",
          success: "rgb(87, 179, 117)",
          error: "rgb(235, 76, 91)",
          warning: "#fbbf24",
        },
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        shimmer: "shimmer 2s linear infinite",
      },
    },
    fontFamily: {
      sans: [
        "Calibre, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji",
      ],
      mono: ["JetBrains Mono, SF Mono, Menlo, Monaco, Consolas, monospace"],
    },
  },
};
