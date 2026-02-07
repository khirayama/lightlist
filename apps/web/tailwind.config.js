/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    zIndex: {
      10: "10",
      20: "20",
      30: "30",
      40: "40",
      50: "50",
      60: "60",
      70: "70",
      80: "80",
      90: "90",
      100: "100",
      1000: "1000",
      1100: "1100",
      1200: "1200",
      1300: "1300",
      1400: "1400",
      1500: "1500",
    },
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "Noto Sans JP",
          "Yu Gothic",
          "YuGothic",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
