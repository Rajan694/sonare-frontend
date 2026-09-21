/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: '#000000',
        s0: '#060607',
        s1: '#0B0B0D',
        s2: '#111114',
        s3: '#17171B',
        s4: '#1E1E23',
        ln: '#1A1A1F',
        ln2: '#26262C',
        ln3: '#33333B',
        t1: '#FFFFFF',
        t2: '#9A9AA8',
        t3: '#7E7E8C',
        t4: '#5A5A66',
        acc: '#00E28A',
        acc2: '#1FE795',
        acc3: '#00C074',
        gold: '#FFC24D',
        red: '#FF4D5E',
        blue: '#4DA3FF',
      },
      fontFamily: {
        sans: ['Geist', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
