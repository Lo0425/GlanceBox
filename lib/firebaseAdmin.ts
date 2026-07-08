import { cert, getApps, getApp, initializeApp, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";

function loadServiceAccount() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Service account JSON keys embed literal "\n" sequences; env files can't
  // hold real newlines, so the value is stored escaped and unescaped here.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials -- set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
    );
  }

  return { projectId, clientEmail, privateKey };
}

// Lazily initialized so importing this module (e.g. during `next build`'s
// route-collection step) never throws just because credentials aren't set
// yet -- the error only surfaces when a request actually needs Firebase.
let app: App | undefined;
function getAdminApp(): App {
  if (!app) {
    app = getApps().length ? getApp() : initializeApp({ credential: cert(loadServiceAccount()) });
  }
  return app;
}

let authInstance: Auth | undefined;
export function getAdminAuth(): Auth {
  if (!authInstance) authInstance = getAuth(getAdminApp());
  return authInstance;
}

let dbInstance: Firestore | undefined;
export function getAdminDb(): Firestore {
  if (!dbInstance) {
    dbInstance = getFirestore(getAdminApp());
    // Widget data (e.g. optional fields on trip/assignment items) can
    // legally contain `undefined`; Firestore rejects that unless told to drop it.
    dbInstance.settings({ ignoreUndefinedProperties: true });
  }
  return dbInstance;
}
