import themeConfig from './theme.config.js';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: themeConfig.colors,
      borderRadius: themeConfig.borderRadius,
      boxShadow: themeConfig.boxShadow,
      fontFamily: themeConfig.fontFamily,
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
