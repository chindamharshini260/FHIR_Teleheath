import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import fallbackConfig from './firebase-applet-config.json';

export default defineConfig(() => {
  // Ensure a valid Firebase API key (starts with 'AIza') is used
  const apiKey =
    process.env.FIREBASE_API_KEY && process.env.FIREBASE_API_KEY.startsWith('AIza')
      ? process.env.FIREBASE_API_KEY
      : fallbackConfig.apiKey;

  const authDomain = process.env.FIREBASE_AUTH_DOMAIN || fallbackConfig.authDomain;
  const projectId = process.env.FIREBASE_PROJECT_ID || fallbackConfig.projectId;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || fallbackConfig.storageBucket;
  const messagingSenderId = process.env.FIREBASE_MESSAGING_SENDER_ID || fallbackConfig.messagingSenderId;
  const appId = process.env.FIREBASE_APP_ID || fallbackConfig.appId;
  const firestoreDatabaseId = process.env.FIREBASE_FIRESTORE_DATABASE_ID || fallbackConfig.firestoreDatabaseId;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      'process.env.FIREBASE_API_KEY': JSON.stringify(apiKey),
      'process.env.FIREBASE_AUTH_DOMAIN': JSON.stringify(authDomain),
      'process.env.FIREBASE_PROJECT_ID': JSON.stringify(projectId),
      'process.env.FIREBASE_STORAGE_BUCKET': JSON.stringify(storageBucket),
      'process.env.FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(messagingSenderId),
      'process.env.FIREBASE_APP_ID': JSON.stringify(appId),
      'process.env.FIREBASE_FIRESTORE_DATABASE_ID': JSON.stringify(firestoreDatabaseId),
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
