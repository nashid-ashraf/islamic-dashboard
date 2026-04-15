import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@islamic-dashboard/shared': path.resolve(__dirname, '../shared/src'),
    },
    extensions: ['.web.ts', '.web.tsx', '.ts', '.tsx', '.js', '.jsx'],
  },
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
  },
});
