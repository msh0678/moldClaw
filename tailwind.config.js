/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Steel Claw Theme - Enhanced Readability
        steel: {
          primary: '#A8B0B8',    // Steel Silver
          dark: '#3A3D42',       // Dark Gunmetal
          light: '#E8EAED',      // Light Silver (더 밝게)
          bright: '#F5F5F5',     // Bright White (가장 밝은 텍스트)
          rust: '#D2691E',       // Rust Brown (더 밝게)
          warm: '#9B9EA3',       // Warm Gray (더 밝게)
          rivet: '#2B2D30',      // Dark Gray
        },
        // Gradient colors for buttons
        primary: '#A8B0B8',      // Steel primary
        secondary: '#C8CDD0',    // Light silver
        accent: '#8B4513',       // Rust accent
      },
      boxShadow: {
        steel: '0 4px 12px rgba(43, 45, 48, 0.5), 0 1px 3px rgba(43, 45, 48, 0.8)',
        'steel-inset': 'inset 0 2px 4px rgba(43, 45, 48, 0.3), inset 0 1px 0 rgba(200, 205, 208, 0.1)',
      }
    },
  },
  plugins: [],
}
