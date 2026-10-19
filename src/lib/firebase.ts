import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import fallbackConfig from '../../firebase-applet-config.json';

const metaEnv = (import.meta as any).env || {};

// Dynamically use Environment Variables first (allowing the user to set their custom Firebase project on Vercel or locally)
const firebaseConfig = {
  apiKey: (metaEnv.VITE_FIREBASE_API_KEY as string) || fallbackConfig.apiKey,
  authDomain: (metaEnv.VITE_FIREBASE_AUTH_DOMAIN as string) || fallbackConfig.authDomain,
  projectId: (metaEnv.VITE_FIREBASE_PROJECT_ID as string) || fallbackConfig.projectId,
  storageBucket: (metaEnv.VITE_FIREBASE_STORAGE_BUCKET as string) || fallbackConfig.storageBucket,
  messagingSenderId: (metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || fallbackConfig.messagingSenderId,
  appId: (metaEnv.VITE_FIREBASE_APP_ID as string) || fallbackConfig.appId,
  measurementId: (metaEnv.VITE_FIREBASE_MEASUREMENT_ID as string) || fallbackConfig.measurementId || ""
};

let app: any;
try {
  app = initializeApp(firebaseConfig);
} catch (appErr: any) {
  console.warn('[FIREBASE] initializeApp notice, using fallback:', appErr);
  try {
    app = initializeApp(fallbackConfig);
  } catch (fbErr) {
    console.error('[FIREBASE] Fatal fallback initializeApp error:', fbErr);
  }
}

let authInstance: any;
try {
  authInstance = getAuth(app);
} catch (authErr) {
  console.error('[FIREBASE] Fatal getAuth error:', authErr);
}
export const auth = authInstance;

// Calculate the project ID being used
const projectId = (metaEnv.VITE_FIREBASE_PROJECT_ID as string) || fallbackConfig.projectId;

// Calculate Firestore database ID safely
let firestoreDbId = (metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID as string) || "";

if (!firestoreDbId) {
  // If we are running in the AI Studio Sandbox (matching the fallback config project ID), we use the custom database
  if (projectId === fallbackConfig.projectId) {
    firestoreDbId = fallbackConfig.firestoreDatabaseId || "";
  } else {
    // If running in a custom user Firebase project (e.g. raplife), default to the (default) database
    firestoreDbId = "";
  }
}

// Security: if databaseId resembles a URL, path, or "(default)", do not pass as custom DB
const isCustomDb = firestoreDbId && 
  firestoreDbId !== '(default)' && 
  firestoreDbId !== 'default' &&
  !firestoreDbId.includes('://') && 
  !firestoreDbId.includes('.') && 
  !firestoreDbId.includes('/');

let dbInstance: any;
try {
  if (isCustomDb) {
    dbInstance = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true,
    }, firestoreDbId);
  } else {
    dbInstance = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true,
    });
  }
} catch (dbErr) {
  console.warn('[FIREBASE] initializeFirestore notice, trying getFirestore fallback:', dbErr);
  try {
    dbInstance = getFirestore(app);
  } catch (gfErr) {
    console.error('[FIREBASE] Fatal getFirestore fallback error:', gfErr);
  }
}
export const db = dbInstance;

let storageInstance: any;
try {
  storageInstance = getStorage(app);
} catch (storageErr) {
  console.error('[FIREBASE] getStorage error:', storageErr);
}
export const storage = storageInstance;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  };
  console.warn('[FIREBASE ERROR]', JSON.stringify(errInfo));
}

export const googleProvider = new GoogleAuthProvider();

// Standard Popup Method
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    const code = error?.code || '';
    if (code === 'auth/popup-blocked') {
      console.warn("[AUTH] El navegador o entorno iframe bloqueó la ventana emergente de Google (auth/popup-blocked).");
    } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      console.log("[AUTH] Ventana de autenticación de Google cerrada por el usuario.");
    } else {
      console.warn("[AUTH] Aviso en autenticación con Google (Popup):", error?.message || error);
    }
    throw error;
  }
};

// Redirect Method - Immune to Pop-up Blockers and Third-Party Cookie Restrictions
export const signInWithGoogleRedirect = async () => {
  try {
    await signInWithRedirect(auth, googleProvider);
  } catch (error: any) {
    console.warn("[AUTH] Aviso en autenticación con Google (Redirect):", error?.message || error);
    throw error;
  }
};

// Expose getRedirectResult to retrieve credentials after returning from redirect
export const getRedirectResultHelper = async () => {
  return await getRedirectResult(auth);
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    try {
      localStorage.removeItem('raplife_demo_session');
    } catch (_) {}
  } catch (error: any) {
    console.warn("[AUTH] Error cerrando sesión:", error?.message || error);
    throw error;
  }
};
