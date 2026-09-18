import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import fallbackConfig from '../../firebase-applet-config.json';

// Support both environment variables and firebase-applet-config.json
const resolveApiKey = (): string => {
  const envKey =
    (typeof process !== 'undefined' && process.env?.FIREBASE_API_KEY) ||
    (import.meta.env?.VITE_FIREBASE_API_KEY as string);
  // Google/Firebase Web API keys always start with AIza
  if (typeof envKey === 'string' && envKey.trim().startsWith('AIza')) {
    return envKey.trim();
  }
  return fallbackConfig.apiKey;
};

export const firebaseConfig = {
  apiKey: resolveApiKey(),
  authDomain:
    (typeof process !== 'undefined' && process.env?.FIREBASE_AUTH_DOMAIN) ||
    (import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN as string) ||
    fallbackConfig.authDomain,
  projectId:
    (typeof process !== 'undefined' && process.env?.FIREBASE_PROJECT_ID) ||
    (import.meta.env?.VITE_FIREBASE_PROJECT_ID as string) ||
    fallbackConfig.projectId,
  storageBucket:
    (typeof process !== 'undefined' && process.env?.FIREBASE_STORAGE_BUCKET) ||
    (import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET as string) ||
    fallbackConfig.storageBucket,
  messagingSenderId:
    (typeof process !== 'undefined' && process.env?.FIREBASE_MESSAGING_SENDER_ID) ||
    (import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID as string) ||
    fallbackConfig.messagingSenderId,
  appId:
    (typeof process !== 'undefined' && process.env?.FIREBASE_APP_ID) ||
    (import.meta.env?.VITE_FIREBASE_APP_ID as string) ||
    fallbackConfig.appId,
  firestoreDatabaseId:
    (typeof process !== 'undefined' && process.env?.FIREBASE_FIRESTORE_DATABASE_ID) ||
    (import.meta.env?.VITE_FIREBASE_FIRESTORE_DATABASE_ID as string) ||
    fallbackConfig.firestoreDatabaseId,
};

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Cloud Firestore with the configured Database ID
export const db = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId &&
    firebaseConfig.firestoreDatabaseId.trim() !== '' &&
    firebaseConfig.firestoreDatabaseId !== '(default)'
    ? firebaseConfig.firestoreDatabaseId
    : undefined
);

// Initialize Firebase Storage
export const storage = getStorage(app);

// Connection test per skill requirements
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, '_connection_test', 'ping'));
    return true;
  } catch (error: any) {
    if (error?.message && error.message.includes('the client is offline')) {
      console.warn('Firebase Firestore is offline. Please check network/config.');
      return false;
    }
    // Any other response (like permission-denied or not-found) confirms network connectivity to Firestore
    return true;
  }
}
