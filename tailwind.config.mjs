/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        moses: {
          bg: '#E8F6FA',
          'bg-alt': '#f4fbfd',
          text: '#1a2833',
          'text-muted': '#5a7a8a',
          primary: '#7FCDEB',
          'primary-deep': '#4DA8D6',
          'primary-dark': '#2E8BC0',
          'primary-soft': '#B8E4F5',
          'primary-faint': '#E0F4FB',
          secondary: '#A8DAED',
          tertiary: '#B8D4F1',
          coral: '#FF6B6B',
          'coral-soft': '#FFE0E0',
          mint: '#4ECDC4',
          'mint-soft': '#E0F7F5',
          sunshine: '#FFD93D',
          'sunshine-soft': '#FFF8D6',
          lavender: '#C9B1FF',
          'lavender-soft': '#F0E8FF',
          surface: '#ffffff',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        'sm': '12px',
        'md': '18px',
        'lg': '24px',
        'pill': '999px',
      },
      animation: {
        'float': 'float 5s ease-in-out infinite',
        'wave': 'wave 2.5s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        wave: {
          '0%': { transform: 'rotate(0deg)' },
          '10%': { transform: 'rotate(14deg)' },
          '20%': { transform: 'rotate(-8deg)' },
          '30%': { transform: 'rotate(14deg)' },
          '40%': { transform: 'rotate(-4deg)' },
          '50%': { transform: 'rotate(10deg)' },
          '60%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(0deg)' },
        },
      },
    },
  },
  plugins: [],
};
