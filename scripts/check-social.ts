// Kiểm tra sinh nhật / kỷ niệm yêu / kỷ niệm chung hiện trên lịch. Chạy: npm test
import { buildSocialEvents, nextBirthday, daysUntil } from '../src/social/socialEvents';
import { getOccurrencesInRange } from '../src/lib/eventUtils';
import { solarToLunar } from '../src/lib/lunar';
import type { FriendLink, SharedMemory, SocialProfile } from '../src/social/types';

let fail = 0;
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : `→ got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const me: SocialProfile = { uid: 'me', displayName: 'Tôi', avatar: '🐱', color: '#f00', birthday: '03-15' };
const lan: SocialProfile = { uid: 'lan', displayName: 'Lan', avatar: '🐰', color: '#0f0', birthday: '12-05', birthYear: 2004 };
const minh: SocialProfile = { uid: 'minh', displayName: 'Minh', avatar: '🦊', color: '#00f', birthday: '08-15', birthdayLunar: true };
const noBday: SocialProfile = { uid: 'x', displayName: 'X', avatar: '🐼', color: '#000' };
const friends: FriendLink[] = [
  { uid: 'lan', relation: 'friend', since: '2025-01-01' },
  { uid: 'minh', relation: 'couple', since: '2024-02-14' },
  { uid: 'x', relation: 'friend', since: '2025-01-01' },
];
const shared: SharedMemory[] = [
  { id: 's1', members: ['me', 'lan'], createdBy: 'me', title: 'Đi Đà Lạt', date: '2026-07-20', note: '', theme: 'peach', stickers: {}, photoCount: 0 },
];

const evs = buildSocialEvents(me, friends, { lan, minh, x: noBday }, shared);
check('Số sự kiện ảo', evs.map((e) => e.id).sort(), ['bday:lan', 'bday:me', 'bday:minh', 'love:minh', 'shared:s1']);

const occ = getOccurrencesInRange(evs, [], new Date(2027, 0, 1), new Date(2027, 11, 31, 23, 59));
const byId = (id: string) => occ.filter((o) => o.eventId === id).map((o) => ymd(o.start));
check('Sinh nhật mình 2027', byId('bday:me'), ['2027-03-15']);
check('Sinh nhật Lan 2027', byId('bday:lan'), ['2027-12-05']);
const minh2027 = byId('bday:minh');
check('Sinh nhật âm 15/8 của Minh 2027 rơi đúng 15/8 âm', minh2027.map((s) => { const [y, m, d] = s.split('-').map(Number); const l = solarToLunar(new Date(y, m - 1, d)); return `${l.day}/${l.month}`; }), ['15/8']);
check('Kỷ niệm yêu 14/2 năm 2027', byId('love:minh'), ['2027-02-14']);
check('Kỷ niệm chung chỉ ở 2026', byId('shared:s1'), []);
check('Kỷ niệm chung 20/7/2026', getOccurrencesInRange(evs, [], new Date(2026, 6, 20), new Date(2026, 6, 20, 23, 59)).filter((o) => o.eventId === 'shared:s1').length, 1);
check('Love chưa có trước năm đầu', getOccurrencesInRange(evs, [], new Date(2024, 0, 1), new Date(2024, 11, 31)).filter((o) => o.eventId === 'love:minh').length, 0);

const from = new Date(2026, 10, 23);
check('Sinh nhật Lan tiếp theo', ymd(nextBirthday(lan, from)!), '2026-12-05');
check('Còn 12 ngày', daysUntil(nextBirthday(lan, from)!, from), 12);
check('Sinh nhật mình đã qua → năm sau', ymd(nextBirthday(me, from)!), '2027-03-15');
check('Không có sinh nhật', nextBirthday(noBday, from), null);
check('Hôm nay là sinh nhật', daysUntil(nextBirthday({ ...lan, birthday: '11-23' }, from)!, from), 0);

// Ẩn khi lịch ảo bị tắt
const hidden = getOccurrencesInRange(evs, [{ id: 'social-friends', name: '', color: '', isVisible: false, isDefault: false }], new Date(2027, 0, 1), new Date(2027, 11, 31));
check('Tắt lịch bạn thân → ẩn hết', hidden.length, 0);

console.log(fail ? `${fail} FAIL` : 'ALL PASS');
process.exit(fail ? 1 : 0);
