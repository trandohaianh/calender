import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore';
import { ensureFirebaseInitialized, getFirestoreDb } from '@/firebase/init';
import { getFirebaseAuth } from '@/firebase/init';

/**
 * Xoá tài khoản Firebase + toàn bộ dữ liệu trên máy chủ của người đó
 * (yêu cầu bắt buộc của Google Play với app cho tạo tài khoản).
 *
 * Thứ tự: dữ liệu chung (bạn bè, kỷ niệm chung, lời mời) → dữ liệu riêng → hồ sơ → tài khoản.
 * Dữ liệu chỉ lưu trên máy (kỷ niệm, đếm ngược…) không bị đụng tới.
 */
export class RecentLoginRequired extends Error {
  constructor() {
    super('Vì an toàn, hãy đăng xuất rồi đăng nhập lại, sau đó xoá tài khoản ngay.');
  }
}

/** Firebase chỉ cho xoá tài khoản nếu vừa đăng nhập (~5 phút) */
const RECENT_MS = 4 * 60 * 1000;

async function deleteAll(refs: DocumentReference[]) {
  const db = getFirestoreDb();
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db);
    refs.slice(i, i + 400).forEach((r) => batch.delete(r));
    await batch.commit();
  }
}

export async function deleteFirebaseAccount(): Promise<void> {
  await ensureFirebaseInitialized();
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Chưa đăng nhập');

  const last = Date.parse(user.metadata.lastSignInTime ?? '');
  if (!user.isAnonymous && !(Date.now() - last < RECENT_MS)) throw new RecentLoginRequired();

  const db = getFirestoreDb();
  const uid = user.uid;

  // 1. Bạn bè: gỡ mình khỏi danh sách của từng người, rồi xoá danh sách của mình
  const friends = await getDocs(collection(db, 'profiles', uid, 'friends'));
  for (const f of friends.docs) {
    await deleteDoc(doc(db, 'profiles', f.id, 'friends', uid)).catch(() => undefined);
  }
  await deleteAll(friends.docs.map((d) => d.ref));

  // 2. Kỷ niệm chung (cả ảnh)
  const shared = await getDocs(query(collection(db, 'sharedMemories'), where('members', 'array-contains', uid)));
  for (const m of shared.docs) {
    const photos = await getDocs(collection(m.ref, 'photos'));
    await deleteAll(photos.docs.map((p) => p.ref));
    await deleteDoc(m.ref);
  }

  // 3. Lời mời kết bạn gửi đi / nhận được
  const [sent, received] = await Promise.all([
    getDocs(query(collection(db, 'friendRequests'), where('from', '==', uid))),
    getDocs(query(collection(db, 'friendRequests'), where('to', '==', uid))),
  ]);
  await deleteAll([...sent.docs, ...received.docs].map((d) => d.ref));

  // 4. Lịch riêng
  const [events, calendars] = await Promise.all([
    getDocs(collection(db, 'users', uid, 'events')),
    getDocs(collection(db, 'users', uid, 'calendars')),
  ]);
  await deleteAll([...events.docs, ...calendars.docs].map((d) => d.ref));
  await deleteDoc(doc(db, 'users', uid)).catch(() => undefined);

  // 5. Hồ sơ + mã mời
  const profile = await getDoc(doc(db, 'profiles', uid));
  const code = profile.exists() ? (profile.data().inviteCode as string | undefined) : undefined;
  if (code) await deleteDoc(doc(db, 'inviteCodes', code)).catch(() => undefined);
  if (profile.exists()) await deleteDoc(profile.ref);

  // 6. Tài khoản đăng nhập
  const { deleteUser } = await import('firebase/auth');
  try {
    await deleteUser(user);
  } catch (e) {
    if ((e as { code?: string }).code === 'auth/requires-recent-login') throw new RecentLoginRequired();
    throw e;
  }
}
