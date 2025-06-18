module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        mtg: {
          white: '#fffbd5',
          blue: '#0e68ab',
          black: '#150b00',
          red: '#d3202a',
          green: '#00733e',
        },
      },
    },
  },
  plugins: [],
};