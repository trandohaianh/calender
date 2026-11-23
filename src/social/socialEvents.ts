import { useMemo } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useCalendarStore } from '@/store/calendarStore';
import { useSocialStore } from '@/store/socialStore';
import { lunarToSolar } from '@/lib/lunar';
import type { CalendarEvent } from '@/types';
import type { FriendLink, SharedMemory, SocialProfile } from './types';

/** Lịch ảo cho dữ liệu bạn bè (không lưu vào sự kiện của bạn) */
export const SOCIAL_CALENDAR_ID = 'social-friends';
export const SOCIAL_COLOR = '#ec4899';

export const VIRTUAL_PREFIX = { birthday: 'bday:', love: 'love:', shared: 'shared:' } as const;

export function isVirtualEventId(id: string) {
  return id.startsWith('bday:') || id.startsWith('love:') || id.startsWith('shared:');
}

function allDay(id: string, title: string, start: Date, extra: Partial<CalendarEvent> = {}): CalendarEvent {
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);
  const e = new Date(s);
  e.setHours(23, 59, 59, 999);
  const now = Timestamp.now();
  return {
    id,
    title,
    startDate: Timestamp.fromDate(s),
    endDate: Timestamp.fromDate(e),
    isAllDay: true,
    color: SOCIAL_COLOR,
    calendarId: SOCIAL_CALENDAR_ID,
    createdAt: now,
    updatedAt: now,
    ...extra,
  };
}

function birthdayEvent(p: SocialProfile, isMe: boolean): CalendarEvent | null {
  if (!p.birthday) return null;
  const [mm, dd] = p.birthday.split('-').map(Number);
  if (!mm || !dd) return null;
  const title = isMe ? '🎂 Sinh nhật của bạn' : `🎂 Sinh nhật ${p.displayName}`;
  const id = `${VIRTUAL_PREFIX.birthday}${p.uid}`;
  if (p.birthdayLunar) {
    // Lấy lần gần nhất trong quá khứ làm gốc rồi lặp hằng năm theo âm lịch
    const y = new Date().getFullYear() - 1;
    const base = lunarToSolar(dd, mm, y) ?? lunarToSolar(Math.min(dd, 29), mm, y);
    if (!base) return null;
    return allDay(id, `${title} (âm lịch ${dd}/${mm})`, base, {
      recurrence: { type: 'lunarYearly', interval: 1 },
    });
  }
  const baseYear = p.birthYear ?? 2000;
  return allDay(id, title, new Date(baseYear, mm - 1, dd), {
    recurrence: { type: 'yearly', interval: 1 },
  });
}

function loveEvent(link: FriendLink, partner?: SocialProfile): CalendarEvent | null {
  if (link.relation !== 'couple' || !link.since) return null;
  const [y, m, d] = link.since.split('-').map(Number);
  if (!y || !m || !d) return null;
  return allDay(
    `${VIRTUAL_PREFIX.love}${link.uid}`,
    `💞 Kỷ niệm ngày yêu${partner ? ` ${partner.displayName}` : ''}`,
    new Date(y + 1, m - 1, d),
    { recurrence: { type: 'yearly', interval: 1 } }
  );
}

function sharedEvent(m: SharedMemory, friend?: SocialProfile): CalendarEvent {
  const [y, mo, d] = m.date.split('-').map(Number);
  return allDay(
    `${VIRTUAL_PREFIX.shared}${m.id}`,
    `💌 ${m.title}${friend ? ` · ${friend.avatar}` : ''}`,
    new Date(y, mo - 1, d),
    { color: '#a855f7' }
  );
}

export function buildSocialEvents(
  me: SocialProfile | null,
  friends: FriendLink[],
  profiles: Record<string, SocialProfile>,
  shared: SharedMemory[]
): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  if (me) {
    const b = birthdayEvent(me, true);
    if (b) out.push(b);
  }
  for (const f of friends) {
    const p = profiles[f.uid];
    if (p) {
      const b = birthdayEvent(p, false);
      if (b) out.push(b);
    }
    const l = loveEvent(f, p);
    if (l) out.push(l);
  }
  for (const m of shared) {
    const other = m.members.find((u) => u !== me?.uid);
    out.push(sharedEvent(m, other ? profiles[other] : undefined));
  }
  return out;
}

/** Sự kiện của bạn + sinh nhật / kỷ niệm của bạn thân (nếu bật) */
export function useAllEvents(): CalendarEvent[] {
  const events = useCalendarStore((s) => s.events);
  const showSocial = useCalendarStore((s) => s.showSocial);
  const me = useSocialStore((s) => s.me);
  const friends = useSocialStore((s) => s.friends);
  const profiles = useSocialStore((s) => s.profiles);
  const shared = useSocialStore((s) => s.shared);
  return useMemo(() => {
    if (!showSocial) return events;
    const extra = buildSocialEvents(me, friends, profiles, shared);
    return extra.length ? [...events, ...extra] : events;
  }, [events, showSocial, me, friends, profiles, shared]);
}

/** Ngày sinh nhật kế tiếp (từ hôm nay) */
export function nextBirthday(p: SocialProfile, from = new Date()): Date | null {
  if (!p.birthday) return null;
  const [mm, dd] = p.birthday.split('-').map(Number);
  const today = new Date(from);
  today.setHours(0, 0, 0, 0);
  for (const y of [today.getFullYear(), today.getFullYear() + 1]) {
    const d = p.birthdayLunar
      ? (lunarToSolar(dd, mm, y) ?? lunarToSolar(Math.min(dd, 29), mm, y))
      : new Date(y, mm - 1, dd);
    if (d && d >= today) return d;
  }
  return null;
}

export function daysUntil(d: Date, from = new Date()): number {
  const a = new Date(from);
  a.setHours(0, 0, 0, 0);
  const b = new Date(d);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
