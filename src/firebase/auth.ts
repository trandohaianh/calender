import type { User, Unsubscribe, UserCredential, GoogleAuthProvider } from 'firebase/auth';
import { ensureFirebaseInitialized, getFirebaseAuth } from '@/firebase/init';
import { useFirebaseStore } from '@/store/firebaseStore';

let googleProvider: GoogleAuthProvider | null = null;

async function getGoogleProvider(): Promise<GoogleAuthProvider> {
  await ensureFirebaseInitialized();
  if (!googleProvider) {
    const { GoogleAuthProvider: Provider } = await import('firebase/auth');
    googleProvider = new Provider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  }
  return googleProvider;
}

function handleAuthError(e: unknown): never {
  useFirebaseStore.getState().setUnavailable(e instanceof Error ? e.message : undefined);
  throw e;
}

/** Đăng nhập Google OAuth */
export async function signInWithGoogle(): Promise<UserCredential> {
  try {
    await ensureFirebaseInitialized();
    const { signInWithPopup } = await import('firebase/auth');
    return await signInWithPopup(getFirebaseAuth(), await getGoogleProvider());
  } catch (e) {
    return handleAuthError(e);
  }
}

/** Đăng nhập email / mật khẩu */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  try {
    await ensureFirebaseInitialized();
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    return await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
  } catch (e) {
    return handleAuthError(e);
  }
}

/** Đăng ký tài khoản mới */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<UserCredential> {
  try {
    await ensureFirebaseInitialized();
    const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
    const credential = await createUserWithEmailAndPassword(
      getFirebaseAuth(),
      email.trim(),
      password
    );
    if (displayName.trim()) {
      await updateProfile(credential.user, { displayName: displayName.trim() });
    }
    return credential;
  } catch (e) {
    return handleAuthError(e);
  }
}

/** Đăng nhập ẩn danh — dùng app không cần đăng ký */
export async function signInAnonymous(): Promise<UserCredential> {
  try {
    await ensureFirebaseInitialized();
    const { signInAnonymously } = await import('firebase/auth');
    return await signInAnonymously(getFirebaseAuth());
  } catch (e) {
    return handleAuthError(e);
  }
}

/** Đăng xuất */
export async function signOut(): Promise<void> {
  try {
    await ensureFirebaseInitialized();
    const { signOut: firebaseSignOut } = await import('firebase/auth');
    await firebaseSignOut(getFirebaseAuth());
  } catch (e) {
    return handleAuthError(e);
  }
}

/** Lắng nghe thay đổi trạng thái auth (gọi sau ensureFirebaseInitialized) */
export async function onAuthStateChange(
  callback: (user: User | null) => void,
  onError?: (error: Error) => void
): Promise<Unsubscribe> {
  try {
    await ensureFirebaseInitialized();
    const { onAuthStateChanged } = await import('firebase/auth');
    return onAuthStateChanged(
      getFirebaseAuth(),
      callback,
      (err) => onError?.(err as Error)
    );
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Không thể khởi tạo Firebase Auth');
    useFirebaseStore.getState().setUnavailable(err.message);
    onError?.(err);
    return () => {};
  }
}

export type { User, UserCredential, Unsubscribe };
