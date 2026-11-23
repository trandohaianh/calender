import { useState } from 'react';
import { HeartHandshake, MoreHorizontal, NotebookPen, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSocialStore } from '@/store/socialStore';
import { toastError, toastSuccess } from '@/store/toastStore';
import { daysUntil, nextBirthday } from '@/social/socialEvents';
import { NOTE_THEMES, type FriendLink, type SocialProfile } from '@/social/types';
import { formatVi } from '@/lib/i18n';
import { formatDateInput } from '@/lib/eventAdapters';

const MILESTONES = [100, 200, 300, 365, 500, 730, 1000, 1095, 1500, 2000, 2500, 3000];

function parseYmd(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export async function startSharedMemory(myUid: string, friend: SocialProfile, title?: string) {
  try {
    const api = await import('@/social/socialApi');
    const theme = NOTE_THEMES[Math.floor(Math.random() * NOTE_THEMES.length)].id;
    const id = await api.createSharedMemory(myUid, friend.uid, {
      title: title ?? `Kỷ niệm với ${friend.displayName}`,
      date: formatDateInput(new Date()),
      theme,
    });
    useSocialStore.getState().openShared(id);
  } catch (e) {
    toastError('Không tạo được kỷ niệm chung', e instanceof Error ? e.message : undefined);
  }
}

function birthdayLabel(p: SocialProfile) {
  const next = nextBirthday(p);
  if (!next) return null;
  const n = daysUntil(next);
  if (n === 0) return { text: 'Hôm nay sinh nhật! 🎉', hot: true };
  if (n === 1) return { text: 'Mai là sinh nhật 🎂', hot: true };
  return { text: `🎂 ${formatVi(next, 'dd/MM')} · còn ${n} ngày`, hot: n <= 7 };
}

export function CoupleCard({ link, partner, me }: { link: FriendLink; partner?: SocialProfile; me: SocialProfile }) {
  const [editing, setEditing] = useState(false);
  const since = parseYmd(link.since);
  const days = Math.max(0, -daysUntil(since)) + 1;
  const next = MILESTONES.find((m) => m > days);
  const nextDate = next ? new Date(since.getTime() + (next - 1) * 86400000) : null;

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-400 via-pink-500 to-fuchsia-600 p-5 text-white shadow-xl">
      <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #fff 2px, transparent 3px), radial-gradient(circle at 80% 70%, #fff 2px, transparent 3px)', backgroundSize: '60px 60px' }} />
      <p className="relative text-center text-xs font-bold uppercase tracking-[0.3em] text-white/80">Love counter</p>
      <div className="relative mt-3 flex items-center justify-center gap-4">
        <Avatar emoji={me.avatar} name={me.displayName} />
        <div className="text-center">
          <div className="animate-heartbeat text-4xl drop-shadow">💖</div>
          <p className="font-fun text-4xl font-extrabold leading-none">{days.toLocaleString('vi-VN')}</p>
          <p className="text-xs font-semibold text-white/85">ngày bên nhau</p>
        </div>
        <Avatar emoji={partner?.avatar ?? '💗'} name={partner?.displayName ?? '…'} />
      </div>
      <div className="relative mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="rounded-full bg-white/20 px-3 py-1">Từ {formatVi(since, 'dd/MM/yyyy')}</span>
        {next && nextDate && (
          <span className="rounded-full bg-white/20 px-3 py-1">
            Mốc {next} ngày: {formatVi(nextDate, 'dd/MM/yyyy')} (còn {next - days} ngày)
          </span>
        )}
      </div>
      <div className="relative mt-3 flex flex-wrap justify-center gap-2">
        {editing ? (
          <input
            type="date"
            defaultValue={link.since}
            max={formatDateInput(new Date())}
            className="rounded-full px-3 py-1 text-sm text-slate-800"
            onChange={async (e) => {
              if (!e.target.value) return;
              const api = await import('@/social/socialApi');
              await api.updateSince(me.uid, link.uid, e.target.value).catch((err) => toastError('Không lưu được', err.message));
              setEditing(false);
              toastSuccess('Đã cập nhật ngày yêu nhau 💞');
            }}
            aria-label="Ngày bắt đầu yêu"
          />
        ) : (
          <Button size="sm" variant="ghost" className="rounded-full bg-white/15 text-white hover:bg-white/25" onClick={() => setEditing(true)}>
            Sửa ngày yêu
          </Button>
        )}
        {partner && (
          <Button size="sm" className="gap-1 rounded-full bg-white font-bold text-pink-600 hover:bg-white/90" onClick={() => void startSharedMemory(me.uid, partner)}>
            <NotebookPen className="h-4 w-4" /> Viết kỷ niệm chung
          </Button>
        )}
      </div>
    </section>
  );
}

function Avatar({ emoji, name }: { emoji: string; name: string }) {
  return (
    <div className="flex w-20 flex-col items-center gap-1">
      <span className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-white/25 text-4xl shadow-inner">{emoji}</span>
      <span className="w-full truncate text-center text-xs font-bold">{name}</span>
    </div>
  );
}

export function FriendCard({ link, profile, myUid }: { link: FriendLink; profile?: SocialProfile; myUid: string }) {
  const [menu, setMenu] = useState(false);
  const bday = profile ? birthdayLabel(profile) : null;
  const color = profile?.color ?? '#a78bfa';

  return (
    <div
      className="group relative flex flex-col items-center rounded-3xl bg-card p-4 text-center shadow-sm ring-1 ring-border transition-all hover:-translate-y-1 hover:shadow-lg animate-pop-in"
      style={{ backgroundImage: `linear-gradient(180deg, ${color}26 0%, transparent 55%)` }}
    >
      <button
        type="button"
        className="absolute right-2 top-2 rounded-full p-1.5 text-muted-foreground opacity-60 hover:bg-muted hover:opacity-100"
        onClick={() => setMenu((v) => !v)}
        aria-label="Tuỳ chọn"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {menu && (
        <div className="absolute right-2 top-9 z-10 rounded-xl border bg-popover p-1 shadow-lg animate-pop-in">
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
            onClick={async () => {
              setMenu(false);
              if (!window.confirm(`Huỷ kết bạn với ${profile?.displayName ?? 'người này'}? Hai bạn sẽ không còn thấy thông tin của nhau.`)) return;
              const api = await import('@/social/socialApi');
              await api.removeFriend(myUid, link.uid).catch((e) => toastError('Không huỷ được', e.message));
            }}
          >
            <UserMinus className="h-4 w-4" /> Huỷ kết bạn
          </button>
        </div>
      )}
      <span
        className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] text-4xl shadow-inner transition-transform group-hover:rotate-6 group-hover:scale-110"
        style={{ background: `${color}33` }}
      >
        {profile?.avatar ?? '⏳'}
      </span>
      <p className="mt-2 w-full truncate font-fun text-base font-extrabold">{profile?.displayName ?? 'Đang tải…'}</p>
      {profile?.bio && <p className="line-clamp-2 text-xs text-muted-foreground">{profile.bio}</p>}
      <p className="mt-1 text-[11px] text-muted-foreground">Bạn thân từ {formatVi(parseYmd(link.since), 'dd/MM/yyyy')}</p>
      {bday && (
        <span className={`mt-2 rounded-full px-2.5 py-0.5 text-xs font-bold ${bday.hot ? 'animate-pulse bg-pink-500 text-white' : 'bg-muted text-muted-foreground'}`}>
          {bday.text}
        </span>
      )}
      {profile && (
        <Button
          size="sm"
          variant="outline"
          className="mt-3 gap-1 rounded-full text-xs"
          onClick={() => void startSharedMemory(myUid, profile)}
        >
          <HeartHandshake className="h-3.5 w-3.5" /> Kỷ niệm chung
        </Button>
      )}
    </div>
  );
}
