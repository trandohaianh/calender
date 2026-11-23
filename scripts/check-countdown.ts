// Kiểm tra tính ngày đếm ngược / tiến độ / thứ tự. Chạy: npm test
import {
  daysLeft,
  sortCountdowns,
  taskProgress,
  timeProgress,
  type Countdown,
} from '../src/store/countdownStore';
import { buildCountdownEvents } from '../src/social/socialEvents';
import { getOccurrencesInRange } from '../src/lib/eventUtils';

let fail = 0;
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : `→ got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

const now = new Date(2026, 10, 23, 21, 30); // 23/11/2026 tối
const mk = (id: string, date: string, createdOn = '2026-11-13', tasks: Countdown['tasks'] = []): Countdown => ({
  id, title: id, emoji: '📚', date, theme: 'candy', createdOn, tasks,
});

check('Còn 12 ngày (bỏ qua giờ trong ngày)', daysLeft(mk('a', '2026-12-05'), now), 12);
check('Hôm nay = 0', daysLeft(mk('a', '2026-11-23'), now), 0);
check('Đã qua 3 ngày', daysLeft(mk('a', '2026-11-20'), now), -3);
check('Qua mốc đổi năm', daysLeft(mk('a', '2027-01-01'), now), 39);
check('Tiến độ thời gian 10/20 ngày', timeProgress(mk('a', '2026-12-03', '2026-11-13'), now), 0.5);
check('Tiến độ không vượt 100%', timeProgress(mk('a', '2026-11-20', '2026-11-13'), now), 1);
check('Chưa có mục tiêu nhỏ → null', taskProgress(mk('a', '2026-12-01')), null);
check(
  'Mục tiêu nhỏ 1/4',
  taskProgress(mk('a', '2026-12-01', '2026-11-13', [
    { id: '1', text: 'a', done: true },
    { id: '2', text: 'b', done: false },
    { id: '3', text: 'c', done: false },
    { id: '4', text: 'd', done: false },
  ])),
  0.25
);
check(
  'Sắp xếp: gần nhất trước, đã qua cuối',
  sortCountdowns([mk('xa', '2027-06-01'), mk('qua', '2026-11-01'), mk('gan', '2026-11-25'), mk('nay', '2026-11-23')], now).map((c) => c.id),
  ['nay', 'gan', 'xa', 'qua']
);

const evs = buildCountdownEvents([mk('thi', '2026-12-05')]);
check('Ngày đích thành sự kiện cả ngày trên lịch', evs.map((e) => [e.id, e.isAllDay]), [['cd:thi', true]]);
const occ = getOccurrencesInRange(evs, [], new Date(2026, 11, 1), new Date(2026, 11, 31, 23, 59));
check('Hiện đúng ngày 05/12', occ.map((o) => o.start.getDate()), [5]);

if (fail) {
  console.log(`\n${fail} test lỗi`);
  process.exit(1);
}
console.log('\nALL PASS');
