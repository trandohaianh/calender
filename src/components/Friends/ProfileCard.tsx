import { useEffect, useState } from 'react';
import { Check, Copy, Pencil, RefreshCw, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toastError, toastSuccess } from '@/store/toastStore';
import { AVATARS, PROFILE_COLORS, type SocialProfile } from '@/social/types';
import { cn } from '@/lib/utils';

export function inviteLink(code: string) {
  return `${window.location.origin}/?invite=${code}`;
}

export function ProfileCard({ me }: { me: SocialProfile }) {
  const [editing, setEditing] = useState(!me.birthday);
  const [name, setName] = useState(me.displayName);
  const [bio, setBio] = useState(me.bio ?? '');
  const [day, setDay] = useState(me.birthday ? Number(me.birthday.slice(3)) : 0);
  const [month, setMonth] = useState(me.birthday ? Number(me.birthday.slice(0, 2)) : 0);
  const [year, setYear] = useState(me.birthYear ? String(me.birthYear) : '');
  const [lunar, setLunar] = useState(!!me.birthdayLunar);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (editing) return;
    setName(me.displayName);
    setBio(me.bio ?? '');
  }, [me, editing]);

  const save = async (patch: Parameters<typeof import('@/social/socialApi').updateMyProfile>[1]) => {
    try {
      const api = await import('@/social/socialApi');
      await api.updateMyProfile(me.uid, patch);
    } catch (e) {
      toastError('Không lưu được hồ sơ', e instanceof Error ? e.message : undefined);
    }
  };

  const saveAll = async () => {
    if (!name.trim()) return toastError('Tên không được để trống');
    const y = Number(year);
    setSaving(true);
    await save({
      displayName: name.trim().slice(0, 40),
      bio: bio.trim().slice(0, 160) || undefined,
      birthday: day && month ? `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : undefined,
      birthYear: y > 1900 && y < 2100 ? y : undefined,
      birthdayLunar: day && month ? lunar : undefined,
    });
    setSaving(false);
    setEditing(false);
    toastSuccess('Đã lưu hồ sơ', 'Chỉ bạn thân mới xem được');
  };

  const code = me.inviteCode ?? '';
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toastError('Không sao chép được', text);
    }
  };
  const share = async () => {
    const text = `Kết bạn với mình trên MyCalendar nhé 💞 Mã: ${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'MyCalendar', text, url: inviteLink(code) });
        return;
      } catch {
        // người dùng huỷ
      }
    }
    await copy(`${text}\n${inviteLink(code)}`);
    toastSuccess('Đã sao chép lời mời', 'Dán vào Messenger / Zalo cho bạn thân');
  };

  return (
    <section
      className="relative overflow-hidden rounded-3xl p-5 text-white shadow-xl"
      style={{ background: `linear-gradient(135deg, ${me.color} 0%, #8b5cf6 100%)` }}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/15 blur-xl" />
      <div className="pointer-events-none absolute -bottom-10 left-10 h-28 w-28 rounded-full bg-white/10 blur-xl" />

      <div className="relative flex items-start gap-4">
        <div className="flex h-20 w-20 shrink-0 animate-floaty items-center justify-center rounded-[1.75rem] bg-white/25 text-5xl shadow-inner backdrop-blur">
          {me.avatar}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Hồ sơ của bạn</p>
          <h2 className="truncate font-fun text-2xl font-extrabold leading-tight">{me.displayName}</h2>
          {me.bio && <p className="mt-0.5 line-clamp-2 text-sm text-white/85">{me.bio}</p>}
          <p className="mt-1 text-sm text-white/90">
            {me.birthday
              ? `🎂 ${Number(me.birthday.slice(3))}/${Number(me.birthday.slice(0, 2))}${me.birthdayLunar ? ' (âm lịch)' : ''}${me.birthYear ? `/${me.birthYear}` : ''}`
              : '🎂 Chưa đặt sinh nhật'}
          </p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-full bg-white/20 p-2 hover:bg-white/30"
            aria-label="Sửa hồ sơ"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </div>

      {editing && (
        <div className="relative mt-4 space-y-3 rounded-2xl bg-white/95 p-4 text-slate-800 shadow-lg animate-pop-in dark:bg-slate-900/95 dark:text-slate-100">
          <div>
            <p className="mb-1.5 text-xs font-bold text-slate-500">Avatar</p>
            <div className="flex flex-wrap gap-1.5">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => void save({ avatar: a })}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl text-xl transition-transform hover:scale-110',
                    me.avatar === a ? 'bg-pink-100 ring-2 ring-pink-400 dark:bg-pink-500/20' : 'bg-slate-100 dark:bg-slate-800'
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-bold text-slate-500">Màu thẻ</p>
            <div className="flex gap-2">
              {PROFILE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Màu ${c}`}
                  onClick={() => void save({ color: c })}
                  className={cn('h-7 w-7 rounded-full transition-transform hover:scale-110', me.color === c && 'ring-2 ring-offset-2 ring-slate-700')}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên hiển thị" maxLength={40} />
            <Input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Một câu về bạn ✨" maxLength={160} />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-bold text-slate-500">Sinh nhật (chỉ bạn thân thấy)</p>
            <div className="flex flex-wrap items-center gap-2">
              <select className="rounded-lg border bg-background px-2 py-1.5 text-sm" value={day} onChange={(e) => setDay(Number(e.target.value))} aria-label="Ngày sinh">
                <option value={0}>Ngày</option>
                {Array.from({ length: lunar ? 30 : 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select className="rounded-lg border bg-background px-2 py-1.5 text-sm" value={month} onChange={(e) => setMonth(Number(e.target.value))} aria-label="Tháng sinh">
                <option value={0}>Tháng</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>Tháng {m}</option>
                ))}
              </select>
              <Input
                className="w-28"
                value={year}
                onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Năm (tuỳ chọn)"
                inputMode="numeric"
                aria-label="Năm sinh"
              />
              <label className="flex items-center gap-1.5 text-sm">
                <Switch checked={lunar} onCheckedChange={setLunar} /> Âm lịch
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            {me.birthday && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Huỷ
              </Button>
            )}
            <Button size="sm" disabled={saving} onClick={() => void saveAll()} className="bg-gradient-to-r from-pink-500 to-violet-500 font-bold text-white">
              Lưu hồ sơ
            </Button>
          </div>
        </div>
      )}

      {/* Mã mời */}
      <div className="relative mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-black/15 p-3 backdrop-blur">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70">Mã kết bạn của bạn</p>
          <p className="font-mono text-2xl font-black tracking-[0.25em]">{code || '········'}</p>
        </div>
        <div className="ml-auto flex gap-1.5">
          <button type="button" onClick={() => void copy(code)} className="rounded-full bg-white/20 p-2 hover:bg-white/30" aria-label="Sao chép mã" title="Sao chép mã">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm('Đổi mã mới? Mã cũ sẽ không dùng được nữa.')) return;
              const api = await import('@/social/socialApi');
              await api.regenerateInviteCode(me.uid, me.inviteCode).catch((e) => toastError('Không đổi được mã', e.message));
            }}
            className="rounded-full bg-white/20 p-2 hover:bg-white/30"
            aria-label="Đổi mã"
            title="Đổi mã (khi lỡ gửi nhầm người)"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <Button size="sm" onClick={() => void share()} className="gap-1 rounded-full bg-white font-bold text-pink-600 hover:bg-white/90">
            <Share2 className="h-4 w-4" /> Mời bạn
          </Button>
        </div>
        <p className="w-full text-[11px] text-white/75">
          Chỉ gửi mã cho người thật thân. Người có mã vẫn phải chờ bạn chấp nhận.
        </p>
      </div>
    </section>
  );
}

