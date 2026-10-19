import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the same build works on GitHub Pages, any static host, and inside the Android (Capacitor) shell.
export default defineConfig({
  base: './',
  plugins: [react()],
  // Output to www/ (Capacitor's convention). dist/ belongs to the earlier buildless prototype on main.
  build: { target: 'es2022', chunkSizeWarningLimit: 1500, outDir: 'www' },
});
