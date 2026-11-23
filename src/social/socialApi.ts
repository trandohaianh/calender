import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { ensureFirebaseInitialized, getFirestoreDb } from '@/firebase/init';
import {
  AVATARS,
  PROFILE_COLORS,
  type FriendLink,
  type FriendRequest,
  type Relation,
  type SharedMemory,
  type SharedPhoto,
  type SocialProfile,
  type Sticker,
} from './types';

/*
 * Cấu trúc Firestore (xem firestore.rules):
 *   profiles/{uid}                      — hồ sơ; chỉ mình + bạn thân đọc
 *   profiles/{uid}/friends/{friendUid}  — danh sách bạn của uid
 *   inviteCodes/{code}                  — mã mời → uid (chỉ get theo mã, không liệt kê)
 *   friendRequests/{from}_{to}          — lời mời kết bạn
 *   sharedMemories/{id}                 — kỷ niệm chung, đúng 2 thành viên
 *   sharedMemories/{id}/photos/{pid}    — ảnh nén dạng data URL
 */

const db = () => getFirestoreDb();
export const ready = () => ensureFirebaseInitialized();

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function randomCode(len = 8) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

/* ───────────────────────────── Hồ sơ ───────────────────────────── */

async function claimInviteCode(uid: string): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = randomCode();
    const ref = doc(db(), 'inviteCodes', code);
    const snap = await getDoc(ref);
    if (snap.exists()) continue;
    await setDoc(ref, { uid, createdAt: serverTimestamp() });
    return code;
  }
  throw new Error('Không tạo được mã mời, thử lại sau');
}

/** Tạo hồ sơ nếu chưa có (lần đầu vào mục Bạn thân) */
export async function ensureProfile(uid: string, displayName: string | null): Promise<void> {
  await ready();
  const ref = doc(db(), 'profiles', uid);
  const snap = await getDoc(ref);
  if (snap.exists() && snap.data().inviteCode) return;
  const inviteCode = await claimInviteCode(uid);
  await setDoc(
    ref,
    {
      displayName: (displayName || 'Bạn mới').slice(0, 40),
      avatar: snap.data()?.avatar ?? pick(AVATARS),
      color: snap.data()?.color ?? pick(PROFILE_COLORS),
      inviteCode,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export type ProfilePatch = Partial<
  Pick<SocialProfile, 'displayName' | 'avatar' | 'color' | 'birthday' | 'birthYear' | 'birthdayLunar' | 'bio'>
>;

export async function updateMyProfile(uid: string, patch: ProfilePatch) {
  await ready();
  const clean: Record<string, any> = { updatedAt: serverTimestamp() }; // eslint-disable-line @typescript-eslint/no-explicit-any
  for (const [k, v] of Object.entries(patch)) clean[k] = v === undefined || v === '' ? deleteField() : v;
  await updateDoc(doc(db(), 'profiles', uid), clean);
}

export async function regenerateInviteCode(uid: string, oldCode?: string) {
  await ready();
  const code = await claimInviteCode(uid);
  await updateDoc(doc(db(), 'profiles', uid), { inviteCode: code, updatedAt: serverTimestamp() });
  if (oldCode) await deleteDoc(doc(db(), 'inviteCodes', oldCode)).catch(() => undefined);
  return code;
}

export function subscribeProfile(
  uid: string,
  cb: (p: SocialProfile | null) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db(), 'profiles', uid),
    (s) => cb(s.exists() ? ({ uid, ...s.data() } as SocialProfile) : null),
    (e) => onError?.(e)
  );
}

/* ─────────────────────────── Kết bạn ─────────────────────────── */

export async function lookupInviteCode(code: string): Promise<string | null> {
  await ready();
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length < 6) return null;
  const snap = await getDoc(doc(db(), 'inviteCodes', clean));
  return snap.exists() ? (snap.data().uid as string) : null;
}

export async function sendFriendRequest(
  me: SocialProfile,
  toUid: string,
  type: Relation
): Promise<void> {
  await ready();
  await setDoc(doc(db(), 'friendRequests', `${me.uid}_${toUid}`), {
    from: me.uid,
    to: toUid,
    type,
    fromName: me.displayName,
    fromAvatar: me.avatar,
    createdAt: serverTimestamp(),
  });
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Người nhận chấp nhận: ghi bạn vào danh sách của cả 2 + xoá lời mời (1 batch) */
export async function acceptFriendRequest(myUid: string, req: FriendRequest): Promise<void> {
  await ready();
  const b = writeBatch(db());
  const since = today();
  b.set(doc(db(), 'profiles', myUid, 'friends', req.from), { relation: req.type, since });
  b.set(doc(db(), 'profiles', req.from, 'friends', myUid), { relation: req.type, since });
  b.delete(doc(db(), 'friendRequests', req.id));
  await b.commit();
}

export async function cancelFriendRequest(req: Pick<FriendRequest, 'id'>): Promise<void> {
  await ready();
  await deleteDoc(doc(db(), 'friendRequests', req.id));
}

export async function removeFriend(myUid: string, friendUid: string): Promise<void> {
  await ready();
  const b = writeBatch(db());
  b.delete(doc(db(), 'profiles', myUid, 'friends', friendUid));
  b.delete(doc(db(), 'profiles', friendUid, 'friends', myUid));
  await b.commit();
}

/** Đổi ngày kỷ niệm (vd: ngày bắt đầu yêu) — cập nhật cả 2 phía */
export async function updateSince(myUid: string, friendUid: string, since: string): Promise<void> {
  await ready();
  const b = writeBatch(db());
  b.update(doc(db(), 'profiles', myUid, 'friends', friendUid), { since });
  b.update(doc(db(), 'profiles', friendUid, 'friends', myUid), { since });
  await b.commit();
}

export function subscribeFriends(myUid: string, cb: (list: FriendLink[]) => void, onError?: (e: Error) => void) {
  return onSnapshot(
    collection(db(), 'profiles', myUid, 'friends'),
    (s) => cb(s.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<FriendLink, 'uid'>) }))),
    (e) => onError?.(e)
  );
}

export function subscribeRequests(
  myUid: string,
  direction: 'incoming' | 'outgoing',
  cb: (list: FriendRequest[]) => void,
  onError?: (e: Error) => void
) {
  return onSnapshot(
    query(collection(db(), 'friendRequests'), where(direction === 'incoming' ? 'to' : 'from', '==', myUid)),
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FriendRequest, 'id'>) }))),
    (e) => onError?.(e)
  );
}

/* ──────────────────────── Kỷ niệm chung ──────────────────────── */

export async function createSharedMemory(
  myUid: string,
  friendUid: string,
  init: { title: string; date: string; theme: string }
): Promise<string> {
  await ready();
  const ref = doc(collection(db(), 'sharedMemories'));
  await setDoc(ref, {
    members: [myUid, friendUid],
    createdBy: myUid,
    title: init.title.slice(0, 80),
    date: init.date,
    note: '',
    theme: init.theme,
    stickers: {},
    photoCount: 0,
    updatedAt: serverTimestamp(),
    updatedBy: myUid,
  });
  return ref.id;
}

export function subscribeSharedList(myUid: string, cb: (list: SharedMemory[]) => void, onError?: (e: Error) => void) {
  return onSnapshot(
    query(collection(db(), 'sharedMemories'), where('members', 'array-contains', myUid)),
    (s) =>
      cb(
        s.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<SharedMemory, 'id'>) }))
          .sort((a, b) => b.date.localeCompare(a.date))
      ),
    (e) => onError?.(e)
  );
}

export function subscribeShared(id: string, cb: (m: SharedMemory | null) => void, onError?: (e: Error) => void) {
  return onSnapshot(
    doc(db(), 'sharedMemories', id),
    (s) => cb(s.exists() ? ({ id, ...(s.data() as Omit<SharedMemory, 'id'>) }) : null),
    (e) => onError?.(e)
  );
}

export async function updateShared(
  id: string,
  myUid: string,
  patch: Partial<Pick<SharedMemory, 'title' | 'date' | 'note' | 'theme'>>
) {
  await ready();
  await updateDoc(doc(db(), 'sharedMemories', id), { ...patch, updatedAt: serverTimestamp(), updatedBy: myUid });
}

/** Ghi từng sticker theo đường dẫn field → 2 người kéo cùng lúc không đè nhau */
export async function putSticker(id: string, myUid: string, s: Sticker) {
  await ready();
  await updateDoc(doc(db(), 'sharedMemories', id), {
    [`stickers.${s.id}`]: s,
    updatedAt: serverTimestamp(),
    updatedBy: myUid,
  });
}

export async function removeSticker(id: string, myUid: string, stickerId: string) {
  await ready();
  await updateDoc(doc(db(), 'sharedMemories', id), {
    [`stickers.${stickerId}`]: deleteField(),
    updatedAt: serverTimestamp(),
    updatedBy: myUid,
  });
}

export function subscribeSharedPhotos(id: string, cb: (list: SharedPhoto[]) => void, onError?: (e: Error) => void) {
  return onSnapshot(
    query(collection(db(), 'sharedMemories', id, 'photos'), orderBy('createdAt', 'asc')),
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SharedPhoto, 'id'>) }))),
    (e) => onError?.(e)
  );
}

export async function addSharedPhoto(id: string, myUid: string, dataUrl: string) {
  await ready();
  const b = writeBatch(db());
  b.set(doc(collection(db(), 'sharedMemories', id, 'photos')), {
    data: dataUrl,
    by: myUid,
    createdAt: serverTimestamp(),
  });
  b.update(doc(db(), 'sharedMemories', id), {
    photoCount: increment(1),
    updatedAt: serverTimestamp(),
    updatedBy: myUid,
  });
  await b.commit();
}

export async function deleteSharedPhoto(id: string, myUid: string, photoId: string) {
  await ready();
  const b = writeBatch(db());
  b.delete(doc(db(), 'sharedMemories', id, 'photos', photoId));
  b.update(doc(db(), 'sharedMemories', id), {
    photoCount: increment(-1),
    updatedAt: serverTimestamp(),
    updatedBy: myUid,
  });
  await b.commit();
}

export async function deleteSharedMemory(id: string) {
  await ready();
  const photos = await getDocs(collection(db(), 'sharedMemories', id, 'photos'));
  const b = writeBatch(db());
  photos.forEach((p) => b.delete(p.ref));
  b.delete(doc(db(), 'sharedMemories', id));
  await b.commit();
}
