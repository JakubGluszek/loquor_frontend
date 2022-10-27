/** @type {import('tailwindcss').Config} */

const { screens } = require("tailwindcss/defaultTheme");

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    screens: {
      xs: "360px",
      ...screens,
    },
    extend: {
      fontFamily: {
        cascadia: ["Cascadia", "mono"],
      },
    },
  },
  plugins: [
    require("daisyui"),
    require("tailwind-scrollbar-hide"),
    require("tailwindcss-animate"),
  ],
  daisyui: {
    styled: true,
    themes: [
      {
        terminal: {
          primary: "#22c55e",
          secondary: "#034a1d",
          accent: "#f3f4f6",
          neutral: "#375702",
          "base-100": "#222b36",
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
