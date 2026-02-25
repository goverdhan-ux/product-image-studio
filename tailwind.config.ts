/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef7ee',
          100: '#fdeed7',
          200: '#fad7ab',
          300: '#f6b773',
          400: '#f28d3d',
          500: '#ed6d18',
          600: '#de4d0a',
          700: '#b83a07',
          800: '#94300c',
          900: '#78290e',
        },
      },
    },
  },
  plugins: [],
};
