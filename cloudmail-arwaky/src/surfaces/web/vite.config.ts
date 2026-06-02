import { defineConfig } from 'vite';
import { reactRouter } from '@react-router/dev/vite';
import { resolve } from 'path';

const proxyTarget = process.env.CMF_API_BASE_URL || process.env.CLOUD_MAIL_FLARE_URL || '';

export default defineConfig({
  plugins: [reactRouter()],
  resolve: {
    alias: {
      '$taxonomy': resolve(__dirname, '../../taxonomy'),
      '$contract': resolve(__dirname, '../../contract'),
    },
  },
  server: proxyTarget ? {
    proxy: {
      '/api': proxyTarget,
    },
  } : undefined,
});