// Kiểm tra âm lịch, ngày lễ, lặp theo âm lịch. Chạy: npm test
import { solarToLunar, lunarToSolar, canChiYear } from '../src/lib/lunar';
import { getHolidays } from '../src/lib/holidays';
import { lunarOccurrenceStarts, lunarNthOccurrence, nextSolarForLunar } from '../src/lib/lunarRecurrence';

let fail = 0;
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : `→ got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}
const ymd = (d: Date | null) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null;

// Tết Nguyên Đán (đã biết)
check('Tết 2024', ymd(lunarToSolar(1, 1, 2024)), '2024-02-10');
check('Tết 2025', ymd(lunarToSolar(1, 1, 2025)), '2025-01-29');
check('Tết 2026', ymd(lunarToSolar(1, 1, 2026)), '2026-02-17');
check('Tết 2027', ymd(lunarToSolar(1, 1, 2027)), '2027-02-06');
check('Trung thu 2026', ymd(lunarToSolar(15, 8, 2026)), '2026-09-25');
check('Can chi 2026', canChiYear(2026), 'Bính Ngọ');
check('Can chi 2024', canChiYear(2024), 'Giáp Thìn');
check('Tháng 6 nhuận 2025', solarToLunar(new Date(2025, 6, 25)), { day: 1, month: 6, year: 2025, leap: true });
check('22/11/2026 → 14/10 âm', solarToLunar(new Date(2026, 10, 22)), { day: 14, month: 10, year: 2026, leap: false });

// Khứ hồi dương → âm → dương cho 3 năm
let roundTripFail = 0;
for (let d = new Date(2024, 0, 1); d < new Date(2027, 0, 1); d.setDate(d.getDate() + 1)) {
  const l = solarToLunar(d);
  if (ymd(lunarToSolar(l.day, l.month, l.year, l.leap)) !== ymd(d)) roundTripFail++;
}
check('Khứ hồi 2024–2026 (1096 ngày)', roundTripFail, 0);

// Ngày lễ
const names = (d: Date) => getHolidays(d).map((h) => h.name);
check('Quốc khánh', names(new Date(2026, 8, 2)), ['Quốc khánh']);
check('Giỗ Tổ 2026', names(new Date(2026, 3, 26)), ['Giỗ Tổ Hùng Vương']);
check('Giao thừa 2026', names(new Date(2026, 1, 16)), ['Giao thừa']);

// Lặp âm lịch
const gio = new Date(2026, 3, 26, 8, 30);
check(
  'Giỗ 10/3 hằng năm',
  lunarOccurrenceStarts(gio, 'lunarYearly', 1, new Date(2026, 0, 1), new Date(2028, 11, 31)).map(ymd),
  ['2026-04-26', '2027-04-16', '2028-04-04']
);
check('Giữ giờ gốc', lunarOccurrenceStarts(gio, 'lunarYearly', 1, new Date(2027, 0, 1), new Date(2027, 11, 31))[0].getHours(), 8);
check(
  'Rằm qua tháng nhuận 2025',
  lunarOccurrenceStarts(new Date(2025, 4, 27), 'lunarMonthly', 1, new Date(2025, 4, 1), new Date(2025, 8, 30)).map(
    (d) => { const l = solarToLunar(d); return `${l.day}/${l.month}${l.leap ? 'N' : ''}`; }
  ),
  ['1/5', '1/6', '1/6N', '1/7', '1/8']
);
check('Gốc tháng nhuận → năm sau tháng thường', ymd(lunarOccurrenceStarts(new Date(2025, 6, 25), 'lunarYearly', 1, new Date(2026, 0, 1), new Date(2026, 11, 31))[0]), '2026-07-14');
check('Lần thứ 3', ymd(lunarNthOccurrence(gio, 'lunarYearly', 1, 3)), '2028-04-04');
check('Ông Táo 23/12 tới', ymd(nextSolarForLunar(23, 12, new Date(2026, 10, 22))), '2027-01-30');

// Ngày 30 ở tháng thiếu → 29
const d30 = (() => { const d = new Date(2026, 0, 1); while (solarToLunar(d).day !== 30) d.setDate(d.getDate() + 1); return d; })();
const days = lunarOccurrenceStarts(d30, 'lunarMonthly', 1, d30, new Date(d30.getFullYear(), d30.getMonth() + 6, 1)).map((d) => solarToLunar(d).day);
check('Ngày 30 chỉ ra 29/30', days.every((x) => x === 29 || x === 30) && days.length >= 5, true);

console.log(fail ? `${fail} FAIL` : 'ALL PASS');
process.exit(fail ? 1 : 0);
