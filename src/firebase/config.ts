/** @deprecated Dùng @/firebase/env và @/firebase/init — giữ re-export để không vỡ import cũ */
export { firebaseConfig, isFirebaseConfigured, getMissingFirebaseEnv } from '@/firebase/env';
export {
  ensureFirebaseInitialized,
  getFirebaseApp,
  getFirebaseAuth,
  getFirestoreDb,
} from '@/firebase/init';
