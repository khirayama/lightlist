const { colors: projectColors } = require("./src/styles/colors");

/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: projectColors.light.background,
          dark: projectColors.dark.background,
        },
        surface: {
          DEFAULT: projectColors.light.surface,
          dark: projectColors.dark.surface,
        },
        text: {
          DEFAULT: projectColors.light.text,
          dark: projectColors.dark.text,
        },
        muted: {
          DEFAULT: projectColors.light.muted,
          dark: projectColors.dark.muted,
        },
        border: {
          DEFAULT: projectColors.light.border,
          dark: projectColors.dark.border,
        },
        primary: {
          DEFAULT: projectColors.light.primary,
          dark: projectColors.dark.primary,
        },
        primaryText: {
          DEFAULT: projectColors.light.primaryText,
          dark: projectColors.dark.primaryText,
        },
        error: {
          DEFAULT: projectColors.light.error,
          dark: projectColors.dark.error,
        },
        success: {
          DEFAULT: projectColors.light.success,
          dark: projectColors.dark.success,
        },
        inputBackground: {
          DEFAULT: projectColors.light.inputBackground,
          dark: projectColors.dark.inputBackground,
        },
        placeholder: {
          DEFAULT: projectColors.light.placeholder,
          dark: projectColors.dark.placeholder,
        },
        ...projectColors.common,
      },
      fontFamily: {
        inter: ["Inter_400Regular"],
        "inter-medium": ["Inter_500Medium"],
        "inter-semibold": ["Inter_600SemiBold"],
        "inter-bold": ["Inter_700Bold"],
      },
    },
  },
  plugins: [],
};
