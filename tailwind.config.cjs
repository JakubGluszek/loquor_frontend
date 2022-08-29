/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      screens: {
        xs: "360px",
      },
    },
  },
  plugins: [require("daisyui"), require("tailwind-scrollbar-hide")],
  daisyui: {
    styled: true,
    themes: [
      {
        terminal: {
          primary: "#22c55e",
          secondary: "#034a1d",
          accent: "#f3f4f6",
          neutral: "#375702",
          "base-100": "#10362b",
          info: "#3ABFF8",
          success: "#36D399",
          warning: "#FBBD23",
          error: "#F87272",
        },
      },
    ],
    base: true,
    utils: true,
    logs: true,
    rtl: false,
    prefix: "",
    darkTheme: "dark",
  },
};
