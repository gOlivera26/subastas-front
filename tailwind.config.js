/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts,css,scss}"
  ],
  theme: {
    extend: {
      colors: {
        'pitch-black': 'var(--color-pitch-black)',
        'graphite': 'var(--color-graphite)',
        'deep-slate': 'var(--color-deep-slate)',
        'charcoal-grey': 'var(--color-charcoal-grey)',
        'muted-ash': 'var(--color-muted-ash)',
        'gunmetal': 'var(--color-gunmetal)',
        'porcelain': 'var(--color-porcelain)',
        'light-steel': 'var(--color-light-steel)',
        'storm-cloud': 'var(--color-storm-cloud)',
        'fog-grey': 'var(--color-fog-grey)',
        'alabaster': 'var(--color-alabaster)',
        'neon-lime': 'var(--color-neon-lime)',
        'aether-blue': 'var(--color-aether-blue)',
        'forest-green': 'var(--color-forest-green)',
        'cyan-spark': 'var(--color-cyan-spark)',
        'emerald': 'var(--color-emerald)',
        'warning-red': 'var(--color-warning-red)',
      }
    },
  },
  plugins: [],
}