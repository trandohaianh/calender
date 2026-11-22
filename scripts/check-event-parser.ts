// Kiểm tra bộ đọc câu tạo lịch. Chạy:
//   npx esbuild scripts/check-event-parser.ts --bundle --platform=node --alias:@=./src --outfile=.tmp/check-event-parser.js && node .tmp/check-event-parser.js
import { detectEventIntent } from '../src/services/aiAdvisorService';
const now = new Date(2026, 9, 7, 19, 0); // Wed 07/10/2026
const cases: [string, string, string][] = [
  ['tạo lịch họp chiều mai 3h', '2026-10-08', '15:00'],
  ['tạo lịch họp lúc 3h chiều mai', '2026-10-08', '15:00'],
  ['đặt lịch hẹn 3 giờ chiều mai tại quán cà phê', '2026-10-08', '15:00'],
  ['thêm lịch sáng mai 9h30 họp nhóm', '2026-10-08', '09:30'],
  ['tạo lịch tối nay lúc 8 giờ', '2026-10-07', '20:00'],
  ['tạo lịch hẹn lúc 20h tại nhà bà ngoại', '2026-10-07', '20:00'],
  ['tạo lịch họp 15:30 thứ 6', '2026-10-09', '15:30'],
  ['tạo lịch chiều mai 3 giờ rưỡi', '2026-10-08', '15:30'],
  ['tạo lịch trưa mai 12h ăn trưa', '2026-10-08', '12:00'],
  ['tạo lịch trưa mai 1h', '2026-10-08', '13:00'],
  ['tạo lịch 11h trưa mai', '2026-10-08', '11:00'],
  ['đặt lịch nhắc nhở 1h khuya', '2026-10-07', '01:00'],
  ['tạo lịch 9h sáng 20/10', '2026-10-20', '09:00'],
];
let fail = 0;
for (const [q, d, t] of cases) {
  const r = detectEventIntent(q, now);
  const got = r.kind === 'parsed' ? `${r.event.dateStr} ${r.event.startTime}` : r.kind;
  const ok = got === `${d} ${t}`;
  if (!ok) fail++;
  console.log(ok ? 'PASS' : 'FAIL', q, '->', got);
}
console.log(fail ? `${fail} FAIL` : 'ALL PASS');
process.exit(fail ? 1 : 0);
