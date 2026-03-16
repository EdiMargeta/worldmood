/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#06060f',
          secondary: '#0d0d1a',
          tertiary: '#141426',
        },
      },
      backgroundOpacity: {
        '3': '0.03',
        '8': '0.08',
      },
    },
  },
  plugins: [],
}
