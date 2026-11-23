import { useMemo } from 'react';
import { Loader2, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { useLocalAuthStore } from '@/store/localAuthStore';
import { useSocialStore } from '@/store/socialStore';
import { daysUntil, nextBirthday } from '@/social/socialEvents';
import { MAX_CLOSE_FRIENDS, NOTE_THEMES, type SharedMemory } from '@/social/types';
import { formatVi } from '@/lib/i18n';
import { ProfileCard } from './ProfileCard';
import { AddFriendCard, IncomingRequests } from './AddFriendCard';
import { CoupleCard, FriendCard } from './FriendCards';

import { canUseSocial } from '@/social/eligibility';

export function FriendsView() {
  const user = useAuthStore((s) => s.user);
  const status = useSocialStore((s) => s.status);
  const error = useSocialStore((s) => s.error);
  const me = useSocialStore((s) => s.me);

  if (!canUseSocial(user)) return <SignInGate />;

  if (status === 'error') {
    return (
      <Centered>
        <div className="max-w-md rounded-3xl bg-card p-6 text-center shadow ring-1 ring-border">
          <div className="text-5xl">🙈</div>
          <p className="mt-2 font-fun text-xl font-extrabold">Chưa kết nối được</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button className="mt-4" onClick={() => user && void useSocialStore.getState().start(user.uid, user.displayName)}>
            Thử lại
          </Button>
        </div>
      </Centered>
    );
  }

  if (!me) {
    return (
      <Centered>
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </Centered>
    );
  }

  return <FriendsHome />;
}

function FriendsHome() {
  const me = useSocialStore((s) => s.me)!;
  const friends = useSocialStore((s) => s.friends);
  const profiles = useSocialStore((s) => s.profiles);
  const shared = useSocialStore((s) => s.shared);

  const couple = friends.find((f) => f.relation === 'couple');
  const close = friends.filter((f) => f.relation === 'friend');

  const upcoming = useMemo(
    () =>
      friends
        .map((f) => profiles[f.uid])
        .filter((p): p is NonNullable<typeof p> => !!p?.birthday)
        .map((p) => ({ p, d: nextBirthday(p)! }))
        .filter((x) => x.d && daysUntil(x.d) <= 60)
        .sort((a, b) => a.d.getTime() - b.d.getTime())
        .slice(0, 4),
    [friends, profiles]
  );

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-pink-50/60 via-background to-violet-50/40 p-3 dark:from-pink-500/5 dark:to-violet-500/5 sm:p-5 animate-fade-in">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <ProfileCard me={me} />
          <div className="space-y-4">
            <AddFriendCard />
            <p className="flex items-start gap-1.5 px-1 text-[11px] text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
              Không ai tìm được bạn nếu không có mã. Hồ sơ, sinh nhật và kỷ niệm chung chỉ hiện với bạn thân đã chấp nhận.
            </p>
          </div>
        </div>

        <IncomingRequests />

        {couple && <CoupleCard link={couple} partner={profiles[couple.uid]} me={me} />}

        {upcoming.length > 0 && (
          <section>
            <SectionTitle emoji="🎂" title="Sinh nhật sắp tới" />
            <div className="flex gap-3 overflow-x-auto pb-1">
              {upcoming.map(({ p, d }) => {
                const n = daysUntil(d);
                return (
                  <div
                    key={p.uid}
                    className="flex min-w-[170px] items-center gap-3 rounded-2xl p-3 text-white shadow-md"
                    style={{ background: `linear-gradient(135deg, ${p.color}, #f59e0b)` }}
                  >
                    <span className="text-3xl">{p.avatar}</span>
                    <div className="min-w-0">
                      <p className="truncate font-bold">{p.displayName}</p>
                      <p className="text-xs text-white/90">
                        {formatVi(d, 'dd/MM')} · {n === 0 ? 'Hôm nay! 🎉' : n === 1 ? 'Ngày mai' : `còn ${n} ngày`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <SectionTitle emoji="👯" title={`Bạn thân (${close.length}/${MAX_CLOSE_FRIENDS})`} />
          {close.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed p-8 text-center">
              <div className="text-5xl animate-floaty">🫶</div>
              <p className="mt-2 font-fun text-lg font-extrabold">Chưa có bạn thân nào</p>
              <p className="text-sm text-muted-foreground">Bấm “Mời bạn” để gửi mã cho người thân nhất của bạn.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {close.map((f) => (
                <FriendCard key={f.uid} link={f} profile={profiles[f.uid]} myUid={me.uid} />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionTitle emoji="💌" title="Kỷ niệm chung" />
          {shared.length === 0 ? (
            <p className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
              Bấm “Kỷ niệm chung” trên thẻ bạn thân để cùng nhau viết note, dán sticker và thêm ảnh 📸
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {shared.map((m) => (
                <SharedCard key={m.id} m={m} myUid={me.uid} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SharedCard({ m, myUid }: { m: SharedMemory; myUid: string }) {
  const profiles = useSocialStore((s) => s.profiles);
  const openShared = useSocialStore((s) => s.openShared);
  const theme = NOTE_THEMES.find((t) => t.id === m.theme) ?? NOTE_THEMES[0];
  const friend = profiles[m.members.find((u) => u !== myUid) ?? ''];
  const stickers = Object.values(m.stickers ?? {}).slice(0, 4);
  const [y, mo, d] = m.date.split('-').map(Number);

  return (
    <button
      type="button"
      onClick={() => openShared(m.id)}
      className="group relative aspect-[4/5] overflow-hidden rounded-3xl p-3 text-left shadow-md transition-all hover:-translate-y-1 hover:rotate-1 hover:shadow-xl"
      style={{ background: theme.bg, color: theme.ink }}
    >
      <span className="absolute right-2 top-2 rounded-full bg-white/70 px-2 py-0.5 text-xl shadow">{friend?.avatar ?? '💗'}</span>
      <p className="pr-10 font-fun text-base font-extrabold leading-tight">{m.title}</p>
      <p className="text-[11px] opacity-75">{formatVi(new Date(y, mo - 1, d), 'dd/MM/yyyy')}</p>
      <p className="mt-1 line-clamp-4 font-hand text-base leading-5 opacity-90">{m.note || '…'}</p>
      <div className="absolute bottom-2 left-3 flex gap-0.5 text-2xl">
        {stickers.map((s) => (
          <span key={s.id} style={{ transform: `rotate(${s.rot}deg)` }}>{s.emoji}</span>
        ))}
      </div>
      {m.photoCount > 0 && (
        <span className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white">📸 {m.photoCount}</span>
      )}
    </button>
  );
}

function SectionTitle({ emoji, title }: { emoji: string; title: string }) {
  return (
    <h3 className="mb-2 flex items-center gap-2 font-fun text-xl font-extrabold">
      <span className="text-2xl">{emoji}</span> {title}
    </h3>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full items-center justify-center p-6">{children}</div>;
}

function SignInGate() {
  const openAuthModal = useLocalAuthStore((s) => s.openAuthModal);
  return (
    <div className="flex h-full items-center justify-center overflow-y-auto bg-gradient-to-br from-pink-100 via-violet-100 to-sky-100 p-6 dark:from-pink-500/10 dark:via-violet-500/10 dark:to-sky-500/10">
      <div className="max-w-md rounded-[2rem] bg-white/80 p-7 text-center shadow-xl backdrop-blur dark:bg-slate-900/80">
        <div className="flex justify-center gap-2 text-5xl">
          <span className="animate-floaty">🐱</span>
          <span className="animate-heartbeat">💖</span>
          <span className="animate-floaty [animation-delay:0.6s]">🐰</span>
        </div>
        <h2 className="mt-3 font-fun text-3xl font-extrabold">Vòng tròn bạn thân</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Thấy sinh nhật bạn thân ngay trên lịch, đếm ngày yêu nhau, cùng nhau trang trí note kỷ niệm với sticker và ảnh.
        </p>
        <ul className="mt-4 space-y-1.5 text-left text-sm">
          <li>🎂 Sinh nhật bạn thân tự hiện trên lịch (cả âm lịch)</li>
          <li>💞 Love counter cho các cặp đôi</li>
          <li>💌 Note chung: viết, dán sticker, thêm ảnh cùng lúc</li>
          <li className="flex items-start gap-1">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            Tối đa {MAX_CLOSE_FRIENDS} bạn thân + 1 người yêu. Không ai tìm được bạn nếu không có mã.
          </li>
        </ul>
        <Button
          className="mt-5 w-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500 py-6 font-fun text-lg font-extrabold text-white shadow-lg"
          onClick={() => openAuthModal('register')}
        >
          Đăng ký / đăng nhập để bắt đầu
        </Button>
        <p className="mt-2 text-[11px] text-muted-foreground">Cần tài khoản thật (email hoặc Google) — tài khoản dùng thử/khách không kết bạn được.</p>
      </div>
    </div>
  );
}
