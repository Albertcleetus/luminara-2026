import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 8080 },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // Keep Phaser in its own chunk so game code rebuilds stay small
        manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : undefined)
      }
    }
  }
});
