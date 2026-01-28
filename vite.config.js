import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Exclude deck.gl from fast refresh
      exclude: /deck\.gl/,
    }),
  ],
  server: {
    open: true,
  },
});
