import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
  const base = repoName
    ? repoName.toLowerCase().endsWith('.github.io')
      ? '/'
      : `/${repoName}/`
    : './';

  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      outDir: process.env.BUILD_OUT_DIR || 'dist',
      assetsDir: 'assets',
    },
  };
});
