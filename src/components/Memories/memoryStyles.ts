import { NOTE_THEMES } from '@/social/types';

/** Kiểu chữ cho note kỷ niệm — đều hỗ trợ tiếng Việt có dấu */
export const NOTE_FONTS = [
  { id: 'hand', label: 'Viết tay', className: 'font-hand text-2xl leading-8' },
  { id: 'mali', label: 'Nghịch ngợm', className: 'font-mali text-xl font-bold leading-8' },
  { id: 'cookie', label: 'Bánh quy', className: 'font-cookie text-xl leading-9' },
  { id: 'script', label: 'Bay bổng', className: 'font-script text-[1.7rem] leading-9' },
  { id: 'round', label: 'Tròn xoe', className: 'font-fun text-2xl font-extrabold leading-8' },
  { id: 'sign', label: 'Bảng hiệu', className: 'font-sign text-lg uppercase leading-8 tracking-wide' },
] as const;

export function noteFont(id?: string) {
  return NOTE_FONTS.find((f) => f.id === id) ?? NOTE_FONTS[0];
}

export const PAPERS = NOTE_THEMES;

export function paperOf(id?: string) {
  return PAPERS.find((p) => p.id === id) ?? PAPERS[0];
}

/** Ghi chú siêu ngắn — giới trẻ lười gõ */
export const NOTE_MAX = 120;

/** Câu chèn nhanh, chạm một cái là xong */
export const QUICK_LINES = [
  'vui xỉu 🤣',
  'nhớ mãi luôn 💖',
  'đỉnh nóc kịch trần 🔥',
  'mệt mà xứng đáng 😮‍💨',
  'lần đầu tiên ✨',
  'ăn no căng 🍜',
  'cười đau bụng 😂',
  'chill phết 🌿',
  'muốn quay lại ghê 🥺',
  'cả hội đông đủ 👯',
];

export const STICKER_PACKS: { id: string; label: string; items: string[]; text?: boolean }[] = [
  { id: 'cute', label: '🎀 Dễ thương', items: ['💖', '✨', '🌈', '🎀', '🌸', '⭐', '🦋', '🐰', '🐱', '🧸', '🍓', '🌷', '💫', '🫶'] },
  { id: 'mood', label: '😆 Cảm xúc', items: ['🥳', '😂', '🥺', '😍', '😎', '🤪', '😭', '🤯', '😴', '🥰', '😤', '🫠', '💀', '👀'] },
  { id: 'food', label: '🧋 Ăn uống', items: ['🧋', '🍰', '🍕', '🍜', '🍦', '🍩', '🍗', '🍣', '🥤', '🍿', '🎂', '🍉'] },
  { id: 'fun', label: '🎈 Đi chơi', items: ['🎈', '📸', '🎶', '🎮', '🏖️', '⛺', '🎡', '✈️', '🚲', '🎤', '🛍️', '🌙', '☀️', '🍀'] },
  { id: 'words', label: '💬 Chữ', text: true, items: ['OMG', 'Yay!', 'Xỉu', 'Iu nhiều', 'Đỉnh', 'Chill', 'Best day', 'Nhớ ghê', 'Hehe', 'Slay', 'Wow', 'Cute xỉu'] },
];

/** Màu nền cho sticker chữ, chọn theo nội dung để ổn định */
const WORD_COLORS = [
  'linear-gradient(135deg,#ff7ab6,#e14eca)',
  'linear-gradient(135deg,#8b5cf6,#6d7cff)',
  'linear-gradient(135deg,#fbbf24,#fb7185)',
  'linear-gradient(135deg,#34d399,#22d3ee)',
  'linear-gradient(135deg,#fb923c,#f43f5e)',
];
export function wordColor(text: string) {
  let h = 0;
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return WORD_COLORS[h % WORD_COLORS.length];
}
