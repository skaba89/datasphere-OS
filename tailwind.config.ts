import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ds: {
          bg:      '#07080F',
          bg1:     '#0D0F1C',
          bg2:     '#12152A',
          bg3:     '#181C30',
          bg4:     '#1E2238',
          border:  '#1F2340',
          border2: '#272B45',
          text:    '#F0F2FF',
          text2:   '#8892B0',
          text3:   '#4A5270',
          blue:    '#5B7FFF',
          blue2:   '#7B9BFF',
          violet:  '#8B5CF6',
          teal:    '#00DDB3',
          rose:    '#FF4D6A',
          amber:   '#FFB547',
          green:   '#00C98D',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        'ds': '14px',
        'ds-sm': '10px',
        'ds-lg': '20px',
        'ds-xl': '28px',
      },
      animation: {
        'fade-up':    'fadeUp .25s ease both',
        'slide-up':   'slideUp .2s cubic-bezier(.4,0,.2,1)',
        'slide-toast':'slideToast .25s cubic-bezier(.4,0,.2,1)',
        'skeleton':   'skeleton 1.5s infinite',
      },
      keyframes: {
        fadeUp:      { from:{ opacity:'0',transform:'translateY(8px)' }, to:{ opacity:'1',transform:'translateY(0)' } },
        slideUp:     { from:{ opacity:'0',transform:'translateY(12px)' }, to:{ opacity:'1',transform:'translateY(0)' } },
        slideToast:  { from:{ opacity:'0',transform:'translateX(16px)' }, to:{ opacity:'1',transform:'translateX(0)' } },
        skeleton:    { '0%,100%':{ opacity:'.5' }, '50%':{ opacity:'1' } },
      },
    },
  },
  plugins: [],
}
export default config
