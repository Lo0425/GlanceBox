import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Lazily initialized: getAuth() validates the config (e.g. API key format)
// synchronously, so calling it at module scope would blow up server-side
// rendering of AuthProvider -- which wraps the root layout, so every page --
// whenever real Firebase config isn't set. Deferring to first call means it
// only ever runs client-side, inside useEffect/event handlers.
let app: FirebaseApp | undefined;
function getFirebaseApp(): FirebaseApp {
  if (!app) app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return app;
}

let authInstance: Auth | undefined;
export function getFirebaseAuth(): Auth {
  if (!authInstance) authInstance = getAuth(getFirebaseApp());
  return authInstance;
}

export const googleProvider = new GoogleAuthProvider();
