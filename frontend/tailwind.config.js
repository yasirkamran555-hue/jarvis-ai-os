/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#7dd3fc',
        secondary: '#a78bfa',
        bg: '#07111f'
      },
      boxShadow: {
        glow: '0 0 20px rgba(125, 211, 252, 0.45)'
      }
    }
  },
  plugins: []
};
