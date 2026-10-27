/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ['./App.tsx', './components/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Duo-style rounded bold voice (Nunito, loaded via expo-font in _layout).
      fontFamily: {
        duo: ['Nunito_800ExtraBold', 'Nunito_700Bold', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
