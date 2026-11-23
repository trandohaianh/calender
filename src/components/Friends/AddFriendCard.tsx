import { useEffect, useState } from 'react';
import { Loader2, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSocialStore } from '@/store/socialStore';
import { toastError, toastSuccess } from '@/store/toastStore';
import { MAX_CLOSE_FRIENDS, type Relation } from '@/social/types';
import { cn } from '@/lib/utils';

export function AddFriendCard() {
  const me = useSocialStore((s) => s.me);
  const friends = useSocialStore((s) => s.friends);
  const outgoing = useSocialStore((s) => s.outgoing);
  const incoming = useSocialStore((s) => s.incoming);
  const pendingInvite = useSocialStore((s) => s.pendingInvite);
  const setPendingInvite = useSocialStore((s) => s.setPendingInvite);

  const [code, setCode] = useState('');
  const [type, setType] = useState<Relation>('friend');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (pendingInvite) {
      setCode(pendingInvite);
      setPendingInvite(null);
    }
  }, [pendingInvite, setPendingInvite]);

  const closeCount = friends.filter((f) => f.relation === 'friend').length;
  const hasCouple = friends.some((f) => f.relation === 'couple');

  const send = async () => {
    if (!me) return;
    if (type === 'friend' && closeCount >= MAX_CLOSE_FRIENDS) {
      return toastError(`Bạn đã đủ ${MAX_CLOSE_FRIENDS} bạn thân`, 'Chỉ dành cho những người thân nhất 💛');
    }
    if (type === 'couple' && hasCouple) return toastError('Bạn đã có người yêu trên MyCalendar rồi 💘');
    setBusy(true);
    try {
      const api = await import('@/social/socialApi');
      const uid = await api.lookupInviteCode(code);
      if (!uid) return toastError('Mã không đúng', 'Kiểm tra lại 8 ký tự bạn của bạn gửi');
      if (uid === me.uid) return toastError('Đây là mã của chính bạn 😄');
      if (friends.some((f) => f.uid === uid)) return toastError('Hai bạn đã là bạn thân rồi');
      // Người kia đã mời mình → chấp nhận luôn
      const reverse = incoming.find((r) => r.from === uid);
      if (reverse) {
        await api.acceptFriendRequest(me.uid, reverse);
        toastSuccess(`Đã kết bạn với ${reverse.fromName} ${reverse.fromAvatar}`);
      } else {
        await api.sendFriendRequest(me, uid, type);
        toastSuccess(type === 'couple' ? 'Đã gửi lời tỏ tình 💘' : 'Đã gửi lời mời kết bạn 💌', 'Chờ người ấy chấp nhận nhé');
      }
      setCode('');
    } catch (e) {
      toastError('Không gửi được lời mời', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border-2 border-dashed border-pink-300 bg-gradient-to-br from-pink-50 to-violet-50 p-4 dark:border-pink-500/40 dark:from-pink-500/10 dark:to-violet-500/10">
      <h3 className="font-fun text-lg font-extrabold">Thêm bạn thân ✨</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Nhập mã 8 ký tự bạn của bạn gửi. Tối đa {MAX_CLOSE_FRIENDS} bạn thân + 1 người yêu ({closeCount}/{MAX_CLOSE_FRIENDS} đã dùng).
      </p>
      <div className="mb-2 flex gap-2">
        {(
          [
            ['friend', '👯 Bạn thân'],
            ['couple', '💘 Người yêu'],
          ] as const
        ).map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-bold transition-all',
              type === t
                ? 'scale-105 bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-pink-100 dark:bg-slate-800 dark:text-slate-300'
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
          placeholder="VD: K7M2QX9P"
          className="h-11 rounded-xl bg-white font-mono text-lg tracking-[0.2em] dark:bg-slate-900"
          aria-label="Mã kết bạn"
          onKeyDown={(e) => e.key === 'Enter' && code.length >= 6 && void send()}
        />
        <Button
          onClick={() => void send()}
          disabled={busy || code.length < 6}
          className="h-11 gap-1 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 px-4 font-bold text-white"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Gửi
        </Button>
      </div>

      {outgoing.length > 0 && (
        <div className="mt-3 space-y-1">
          {outgoing.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-1.5 text-xs dark:bg-slate-900/60">
              <span>{r.type === 'couple' ? '💘' : '💌'}</span>
              <span className="flex-1 text-muted-foreground">Đang chờ chấp nhận…</span>
              <button
                type="button"
                className="rounded-full p-1 hover:bg-muted"
                aria-label="Huỷ lời mời"
                onClick={async () => {
                  const api = await import('@/social/socialApi');
                  await api.cancelFriendRequest(r);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function IncomingRequests() {
  const me = useSocialStore((s) => s.me);
  const incoming = useSocialStore((s) => s.incoming);
  const friends = useSocialStore((s) => s.friends);
  if (!me || incoming.length === 0) return null;

  const closeCount = friends.filter((f) => f.relation === 'friend').length;
  const hasCouple = friends.some((f) => f.relation === 'couple');

  return (
    <section className="space-y-2">
      <h3 className="font-fun text-lg font-extrabold">Lời mời mới 🔔</h3>
      {incoming.map((r) => (
        <div
          key={r.id}
          className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-100 to-pink-100 p-3 shadow-sm animate-pop-in dark:from-amber-500/15 dark:to-pink-500/15"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-3xl shadow dark:bg-slate-800">{r.fromAvatar}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{r.fromName}</p>
            <p className="text-xs text-muted-foreground">
              {r.type === 'couple' ? 'muốn trở thành người yêu của bạn 💘' : 'muốn làm bạn thân của bạn 👯'}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              const api = await import('@/social/socialApi');
              await api.cancelFriendRequest(r);
            }}
          >
            Từ chối
          </Button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-pink-500 to-violet-500 font-bold text-white"
            onClick={async () => {
              if (r.type === 'friend' && closeCount >= MAX_CLOSE_FRIENDS) {
                return toastError(`Bạn đã đủ ${MAX_CLOSE_FRIENDS} bạn thân`, 'Huỷ bớt một người để thêm bạn mới');
              }
              if (r.type === 'couple' && hasCouple) return toastError('Bạn đã có người yêu rồi 💘');
              try {
                const api = await import('@/social/socialApi');
                await api.acceptFriendRequest(me.uid, r);
                toastSuccess(r.type === 'couple' ? `Chúc mừng hai bạn 💞` : `Đã kết bạn với ${r.fromName} 🎉`);
              } catch (e) {
                toastError('Không chấp nhận được', e instanceof Error ? e.message : undefined);
              }
            }}
          >
            Đồng ý
          </Button>
        </div>
      ))}
    </section>
  );
}
