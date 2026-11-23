import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'icons/*.png',
        'screenshots/*.png',
        'favicon.svg',
        'offline.html',
      ],
      manifest: {
        name: 'MyCalendar',
        short_name: 'Calendar',
        description:
          'Lịch cá nhân — quản lý sự kiện, đồng bộ Firebase, hoạt động offline',
        theme_color: '#ec4899',
        background_color: '#fdf4fb',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        id: '/',
        lang: 'vi',
        dir: 'ltr',
        categories: ['productivity', 'utilities'],
        prefer_related_applications: false,
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        screenshots: [
          {
            src: '/screenshots/month-view.png',
            sizes: '1080x1920',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Chế độ xem tháng',
          },
          {
            src: '/screenshots/week-view.png',
            sizes: '1080x1920',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Chế độ xem tuần',
          },
          {
            src: '/screenshots/desktop.png',
            sizes: '1920x1080',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Giao diện desktop',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff,webmanifest}'],
        globIgnores: ['**/node_modules/**', 'sw.ts'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: {
        // Tắt SW khi dev — tránh cache/chậm lần tải đầu trên localhost
        enabled: false,
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    strictPort: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', 'date-fns'],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
