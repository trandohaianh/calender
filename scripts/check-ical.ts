// Kiểm tra nhập / xuất .ics. Chạy: npm test
import { Timestamp } from 'firebase/firestore';
import { parseICS, eventsToICS } from '../src/lib/ical';
import type { CalendarEvent } from '../src/types';

let fail = 0;
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : `→ got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

const src = [
  'BEGIN:VCALENDAR',
  'BEGIN:VEVENT',
  'DTSTART;VALUE=DATE:20261224',
  'DTEND;VALUE=DATE:20261226',
  'SUMMARY:Nghỉ Noel\\, đi chơi',
  'RRULE:FREQ=YEARLY;COUNT=3',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTSTART:20261123T020000Z',
  'DTEND:20261123T033000Z',
  'SUMMARY:Họp nhóm rất dài để kiểm tra việc gập dòng theo chuẩn RFC 5545 có hoạt động đú',
  ' ng',
  'LOCATION:Phòng 301',
  'BEGIN:VALARM',
  'TRIGGER:-PT15M',
  'END:VALARM',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'SUMMARY:không có ngày',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

const r = parseICS(src, 'cal', '#1a73e8');
check('Số sự kiện', r.events.length, 2);
check('Bỏ qua mục lỗi', r.skipped, 1);
const [noel, hop] = r.events;
check('Bỏ escape dấu phẩy', noel.title, 'Nghỉ Noel, đi chơi');
check('Cả ngày', noel.isAllDay, true);
check('DTEND exclusive → 25/12', noel.endDate.toDate().getDate(), 25);
check('RRULE COUNT=3 → hết 2028', noel.recurrence?.endDate?.toDate().getFullYear(), 2028);
check('Nối dòng gập', hop.title.endsWith('đúng'), true);
check('Giờ UTC', hop.startDate.toDate().toISOString(), '2026-11-23T02:00:00.000Z');
check('Nhắc 15 phút', hop.reminder, 15);

// Khứ hồi
const asEvents = r.events.map((e, i) => ({ ...e, id: `x${i}`, createdAt: Timestamp.now(), updatedAt: Timestamp.now() })) as CalendarEvent[];
const out = eventsToICS(asEvents);
check('Dòng ≤ 75 byte', out.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75), true);
const r2 = parseICS(out, 'c', '#000');
check(
  'Khứ hồi giữ nguyên',
  r2.events.map((e) => [e.title, e.startDate.toMillis(), e.endDate.toMillis() - (e.isAllDay ? 0 : 0)]),
  r.events.map((e) => [e.title, e.startDate.toMillis(), e.endDate.toMillis()])
);

// Sự kiện lặp âm lịch → xuất từng lần
const gio: CalendarEvent = {
  id: 'gio',
  title: 'Giỗ ông',
  startDate: Timestamp.fromDate(new Date(2026, 3, 26)),
  endDate: Timestamp.fromDate(new Date(2026, 3, 26, 23, 59, 59, 999)),
  isAllDay: true,
  color: '#000',
  calendarId: 'c',
  recurrence: { type: 'lunarYearly', interval: 1 },
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
};
const gioIcs = eventsToICS([gio]);
check('Âm lịch không xuất RRULE', gioIcs.includes('RRULE'), false);
check('Âm lịch có lần 2027 (16/4)', gioIcs.includes('DTSTART;VALUE=DATE:20270416'), true);

console.log(fail ? `${fail} FAIL` : 'ALL PASS');
process.exit(fail ? 1 : 0);
