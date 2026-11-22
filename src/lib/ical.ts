import { Timestamp } from 'firebase/firestore';
import { addDays, addMonths } from 'date-fns';
import { getEventDateRange } from '@/lib/eventAdapters';
import type { CalendarEvent, CreateCalendarEventInput, RecurrenceType } from '@/types';
import { isLunarRecurrence } from '@/types';
import { describeLunarRecurrence, lunarOccurrenceStarts } from '@/lib/lunarRecurrence';

/* ----------------------------- Export ----------------------------- */

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function icsDate(d: Date) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function icsDateTimeUtc(d: Date) {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function escapeText(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Gập dòng dài theo RFC 5545 (75 octet) */
function fold(line: string) {
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = new TextEncoder().encode(ch).length;
    if (bytes + b > 73) {
      out.push(cur);
      cur = ' ';
      bytes = 1;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join('\r\n');
}

const FREQ: Record<Exclude<RecurrenceType, 'lunarMonthly' | 'lunarYearly'>, string> = {
  daily: 'DAILY',
  weekly: 'WEEKLY',
  monthly: 'MONTHLY',
  yearly: 'YEARLY',
};

export function eventsToICS(events: CalendarEvent[], calName = 'MyCalendar'): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MyCalendar//VI',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeText(calName)}`,
  ];
  const stamp = icsDateTimeUtc(new Date());

  const writeEvent = (ev: CalendarEvent, start: Date, end: Date, uid: string, note?: string) => {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}@mycalendar`);
    lines.push(`DTSTAMP:${stamp}`);
    if (ev.isAllDay) {
      lines.push(`DTSTART;VALUE=DATE:${icsDate(start)}`);
      // DTEND của sự kiện cả ngày là ngày kế tiếp (exclusive)
      lines.push(`DTEND;VALUE=DATE:${icsDate(addDays(end, 1))}`);
    } else {
      lines.push(`DTSTART:${icsDateTimeUtc(start)}`);
      lines.push(`DTEND:${icsDateTimeUtc(end)}`);
    }
    lines.push(`SUMMARY:${escapeText(ev.title)}`);
    if (ev.location) lines.push(`LOCATION:${escapeText(ev.location)}`);
    const desc = [ev.description, note].filter(Boolean).join('\n\n');
    if (desc) lines.push(`DESCRIPTION:${escapeText(desc)}`);
    if (ev.recurrence && !isLunarRecurrence(ev.recurrence.type)) {
      let rule = `FREQ=${FREQ[ev.recurrence.type as keyof typeof FREQ]}`;
      if (ev.recurrence.interval > 1) rule += `;INTERVAL=${ev.recurrence.interval}`;
      if (ev.recurrence.endDate) rule += `;UNTIL=${icsDateTimeUtc(ev.recurrence.endDate.toDate())}`;
      lines.push(`RRULE:${rule}`);
    }
    if (ev.reminder) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(ev.title)}`);
      lines.push(`TRIGGER:-PT${ev.reminder}M`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  };

  for (const ev of events) {
    const { start, end } = getEventDateRange(ev);
    const rec = ev.recurrence;
    if (rec && isLunarRecurrence(rec.type)) {
      // iCalendar không có quy tắc lặp âm lịch → xuất từng lần (năm âm: 1 năm trước → 10 năm tới;
      // tháng âm: 2 năm tới)
      const now = new Date();
      const from = new Date(now.getFullYear() - 1, 0, 1);
      const to = new Date(now.getFullYear() + (rec.type === 'lunarYearly' ? 10 : 2), 11, 31);
      const limit = rec.endDate?.toDate();
      const duration = end.getTime() - start.getTime();
      const note = `Lặp theo ${describeLunarRecurrence(start, rec.type)} (MyCalendar)`;
      for (const s of lunarOccurrenceStarts(start, rec.type, rec.interval, from, to)) {
        if (limit && s > limit) break;
        writeEvent(ev, s, new Date(s.getTime() + duration), `${ev.id}-${icsDate(s)}`, note);
      }
      continue;
    }
    writeEvent(ev, start, end, ev.id);
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function downloadICS(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ----------------------------- Import ----------------------------- */

interface ParsedProp {
  name: string;
  params: Record<string, string>;
  value: string;
}

function unfold(text: string): string[] {
  return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}

function parseLine(line: string): ParsedProp | null {
  const idx = line.indexOf(':');
  if (idx < 0) return null;
  const head = line.slice(0, idx);
  const value = line.slice(idx + 1);
  const [name, ...paramParts] = head.split(';');
  const params: Record<string, string> = {};
  for (const p of paramParts) {
    const [k, v] = p.split('=');
    if (k) params[k.toUpperCase()] = (v ?? '').replace(/^"|"$/g, '');
  }
  return { name: name.toUpperCase(), params, value };
}

function unescapeText(s: string) {
  return s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
}

/** Trả về Date + cờ cả ngày. Giờ có TZID được coi như giờ địa phương. */
function parseIcsDate(prop: ParsedProp): { date: Date; allDay: boolean } | null {
  const v = prop.value.trim();
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, hh, mm, ss, z] = m;
  if (!hh || prop.params.VALUE === 'DATE') {
    return { date: new Date(+y, +mo - 1, +d), allDay: true };
  }
  if (z) {
    return { date: new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm, +(ss ?? 0))), allDay: false };
  }
  return { date: new Date(+y, +mo - 1, +d, +hh, +mm, +(ss ?? 0)), allDay: false };
}

function parseRRule(
  value: string,
  start: Date
): CreateCalendarEventInput['recurrence'] | undefined {
  const parts = Object.fromEntries(
    value.split(';').map((p) => {
      const [k, v] = p.split('=');
      return [k.toUpperCase(), v];
    })
  );
  const map: Record<string, RecurrenceType> = {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    YEARLY: 'yearly',
  };
  const type = map[parts.FREQ?.toUpperCase()];
  if (!type) return undefined;
  const interval = Math.max(1, parseInt(parts.INTERVAL ?? '1', 10) || 1);
  const rec: NonNullable<CreateCalendarEventInput['recurrence']> = { type, interval };
  if (parts.UNTIL) {
    const u = parseIcsDate({ name: 'UNTIL', params: {}, value: parts.UNTIL });
    if (u) {
      const end = new Date(u.date);
      if (u.allDay) end.setHours(23, 59, 59, 999);
      rec.endDate = Timestamp.fromDate(end);
    }
  } else if (parts.COUNT) {
    const n = Math.max(1, parseInt(parts.COUNT, 10)) - 1;
    let end = new Date(start);
    if (type === 'daily') end = addDays(end, n * interval);
    else if (type === 'weekly') end = addDays(end, n * 7 * interval);
    else if (type === 'monthly') end = addMonths(end, n * interval);
    else end = addMonths(end, n * 12 * interval);
    end.setHours(23, 59, 59, 999);
    rec.endDate = Timestamp.fromDate(end);
  }
  return rec;
}

function parseTriggerMinutes(v: string): number | undefined {
  const m = v.match(/^-?P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/);
  if (!m) return undefined;
  const total = (+(m[1] ?? 0)) * 1440 + (+(m[2] ?? 0)) * 60 + +(m[3] ?? 0);
  const allowed = [0, 5, 15, 30, 60, 1440];
  return allowed.reduce((best, a) => (Math.abs(a - total) < Math.abs(best - total) ? a : best), 0);
}

export interface ParseResult {
  events: CreateCalendarEventInput[];
  skipped: number;
}

export function parseICS(text: string, calendarId: string, color: string): ParseResult {
  const lines = unfold(text);
  const events: CreateCalendarEventInput[] = [];
  let skipped = 0;
  let cur: ParsedProp[] | null = null;
  let inAlarm = false;
  let alarmTrigger: string | undefined;

  const finish = (props: ParsedProp[], trigger?: string) => {
    const get = (n: string) => props.find((p) => p.name === n);
    const dtStart = get('DTSTART');
    const s = dtStart && parseIcsDate(dtStart);
    if (!s) {
      skipped++;
      return;
    }
    const dtEnd = get('DTEND');
    const e = dtEnd && parseIcsDate(dtEnd);
    let start = s.date;
    let end: Date;
    if (s.allDay) {
      start = new Date(start);
      start.setHours(0, 0, 0, 0);
      // DTEND exclusive → lùi 1 ngày
      end = e ? addDays(e.date, -1) : new Date(start);
      if (end < start) end = new Date(start);
      end.setHours(23, 59, 59, 999);
    } else {
      end = e ? e.date : new Date(start.getTime() + 60 * 60 * 1000);
      if (end <= start) end = new Date(start.getTime() + 30 * 60 * 1000);
    }

    const summary = get('SUMMARY');
    const input: CreateCalendarEventInput = {
      title: summary ? unescapeText(summary.value).trim() || '(Không tiêu đề)' : '(Không tiêu đề)',
      startDate: Timestamp.fromDate(start),
      endDate: Timestamp.fromDate(end),
      isAllDay: s.allDay,
      color,
      calendarId,
    };
    const loc = get('LOCATION');
    if (loc?.value) input.location = unescapeText(loc.value);
    const desc = get('DESCRIPTION');
    if (desc?.value) input.description = unescapeText(desc.value);
    const rrule = get('RRULE');
    if (rrule) {
      const rec = parseRRule(rrule.value, start);
      if (rec) input.recurrence = rec;
    }
    if (trigger) {
      const mins = parseTriggerMinutes(trigger);
      if (mins) input.reminder = mins;
    }
    events.push(input);
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line) continue;
    if (line === 'BEGIN:VEVENT') {
      cur = [];
      alarmTrigger = undefined;
      continue;
    }
    if (line === 'END:VEVENT') {
      if (cur) finish(cur, alarmTrigger);
      cur = null;
      continue;
    }
    if (!cur) continue;
    if (line === 'BEGIN:VALARM') {
      inAlarm = true;
      continue;
    }
    if (line === 'END:VALARM') {
      inAlarm = false;
      continue;
    }
    const prop = parseLine(line);
    if (!prop) continue;
    if (inAlarm) {
      if (prop.name === 'TRIGGER' && !alarmTrigger) alarmTrigger = prop.value;
      continue;
    }
    cur.push(prop);
  }

  return { events, skipped };
}
