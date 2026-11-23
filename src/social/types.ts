import type { Timestamp } from 'firebase/firestore';

export const MAX_CLOSE_FRIENDS = 10;
export const MAX_SHARED_PHOTOS = 6;

export type Relation = 'friend' | 'couple';

/** profiles/{uid} — chỉ chính mình và bạn thân đọc được */
export interface SocialProfile {
  uid: string;
  displayName: string;
  /** Emoji làm avatar (sinh động, không cần ảnh) */
  avatar: string;
  /** Màu chủ đạo của thẻ hồ sơ */
  color: string;
  /** "MM-DD" — để trống nếu không muốn chia sẻ */
  birthday?: string;
  birthYear?: number;
  /** Sinh nhật tính theo âm lịch */
  birthdayLunar?: boolean;
  bio?: string;
  inviteCode?: string;
  updatedAt?: Timestamp;
}

/** profiles/{owner}/friends/{friendUid} */
export interface FriendLink {
  uid: string;
  relation: Relation;
  /** Ngày bắt đầu (kết bạn / yêu nhau) yyyy-MM-dd */
  since: string;
}

/** friendRequests/{from}_{to} */
export interface FriendRequest {
  id: string;
  from: string;
  to: string;
  type: Relation;
  fromName: string;
  fromAvatar: string;
  createdAt?: Timestamp;
}

export interface Sticker {
  id: string;
  emoji: string;
  /** vị trí theo % khung (0–100) */
  x: number;
  y: number;
  rot: number;
  scale: number;
  by: string;
}

/** sharedMemories/{id} — đúng 2 thành viên */
export interface SharedMemory {
  id: string;
  members: [string, string];
  createdBy: string;
  title: string;
  /** yyyy-MM-dd */
  date: string;
  note: string;
  theme: string;
  stickers: Record<string, Sticker>;
  photoCount: number;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

/** sharedMemories/{id}/photos/{photoId} */
export interface SharedPhoto {
  id: string;
  data: string; // data URL jpeg (~≤150KB)
  by: string;
  createdAt?: Timestamp;
}

export const AVATARS = ['🐱', '🐶', '🐰', '🦊', '🐼', '🐨', '🐯', '🦄', '🐸', '🐧', '🐻', '🐹', '🌸', '🌻', '⭐', '🍓', '🍑', '🧋', '🎧', '🎮'];
export const PROFILE_COLORS = ['#ff6b9d', '#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#fb923c', '#f472b6', '#22d3ee'];
export const STICKERS = ['💖', '✨', '🌈', '🎀', '🌸', '⭐', '🔥', '🥳', '😂', '🥺', '🍰', '🧋', '🎂', '📸', '🎈', '🦋', '🍀', '☀️', '🌙', '💌', '🐾', '🎶', '🍕', '✌️'];

export interface NoteTheme {
  id: string;
  label: string;
  /** CSS background của trang note */
  bg: string;
  ink: string;
}

export const NOTE_THEMES: NoteTheme[] = [
  { id: 'peach', label: 'Đào', bg: 'linear-gradient(135deg,#ffe1e8 0%,#ffd6a5 100%)', ink: '#7a2e3b' },
  { id: 'lavender', label: 'Oải hương', bg: 'linear-gradient(135deg,#e9d5ff 0%,#c7d2fe 100%)', ink: '#3b2a6b' },
  { id: 'mint', label: 'Bạc hà', bg: 'linear-gradient(135deg,#d1fae5 0%,#bae6fd 100%)', ink: '#134e4a' },
  { id: 'sunset', label: 'Hoàng hôn', bg: 'linear-gradient(135deg,#fde68a 0%,#fca5a5 55%,#c4b5fd 100%)', ink: '#5b2135' },
  {
    id: 'grid',
    label: 'Giấy kẻ',
    bg: '#fffdf5 repeating-linear-gradient(0deg,transparent 0 27px,#e8e2cf 27px 28px)',
    ink: '#3f3a2a',
  },
  { id: 'night', label: 'Đêm sao', bg: 'radial-gradient(circle at 30% 20%,#4c1d95 0%,#1e1b4b 60%,#0f172a 100%)', ink: '#f5f3ff' },
];
