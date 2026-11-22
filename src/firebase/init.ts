import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { firebaseConfig, getMissingFirebaseEnv, isFirebaseConfigured } from '@/firebase/env';
import { useFirebaseStore } from '@/store/firebaseStore';

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let initPromise: Promise<void> | null = null;

function configError(): string {
  return `Thiếu cấu hình Firebase (${getMissingFirebaseEnv().join(', ')}). App vẫn chạy UI nhưng không đồng bộ được.`;
}

/** Tải SDK Firebase chỉ khi đã có .env hợp lệ */
export function ensureFirebaseInitialized(): Promise<void> {
  if (!isFirebaseConfigured()) {
    return Promise.reject(new Error(configError()));
  }
  if (app && auth && db) return Promise.resolve();
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const [{ initializeApp }, authMod, fsMod] = await Promise.all([
          import('firebase/app'),
          import('firebase/auth'),
          import('firebase/firestore'),
        ]);
        app = initializeApp(firebaseConfig);
        auth = authMod.getAuth(app);
        db = fsMod.getFirestore(app);
      } catch (e) {
        initPromise = null;
        const msg = e instanceof Error ? e.message : 'Không thể khởi tạo Firebase';
        useFirebaseStore.getState().setUnavailable(msg);
        throw e;
      }
    })();
  }
  return initPromise;
}

function assertReady(): void {
  if (!isFirebaseConfigured()) {
    const message = configError();
    useFirebaseStore.getState().setUnavailable(message);
    throw new Error(message);
  }
  if (!app || !auth || !db) {
    throw new Error('Firebase chưa khởi tạo — gọi ensureFirebaseInitialized() trước');
  }
}

export function getFirebaseApp(): FirebaseApp {
  assertReady();
  return app!;
}

export function getFirebaseAuth(): Auth {
  assertReady();
  return auth!;
}

export function getFirestoreDb(): Firestore {
  assertReady();
  return db!;
}
