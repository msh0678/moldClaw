/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // moldClaw Forge Theme
        forge: {
          copper: '#E86B2A',     // 🟠 Primary - Molten Copper
          dark: '#2A2D3E',       // 🔵 Secondary - Dark Forge
          amber: '#F5A623',      // 🟡 Accent - Bright Amber
          night: '#1E2030',      // ⚫ Surface/BG - Deep Night
          text: '#E8E8EC',       // ⚪ Text - Soft White
          success: '#4CAF82',    // 🟢 Success - Forge Green
          error: '#E05252',      // 🔴 Error - Heat Red
          muted: '#8B8D98',      // Muted text
          surface: '#252836',    // Slightly lighter surface
        },
        // Legacy aliases for gradual migration
        primary: '#E86B2A',
        secondary: '#2A2D3E',
        accent: '#F5A623',
      },
      boxShadow: {
        forge: '0 4px 12px rgba(30, 32, 48, 0.5), 0 1px 3px rgba(30, 32, 48, 0.8)',
        'forge-glow': '0 0 20px rgba(232, 107, 42, 0.3)',
        'forge-inset': 'inset 0 2px 4px rgba(30, 32, 48, 0.3), inset 0 1px 0 rgba(232, 232, 236, 0.1)',
      }
    },
  },
  plugins: [],
}
