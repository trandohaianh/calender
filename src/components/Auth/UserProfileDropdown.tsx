import { useState, useRef, useEffect } from 'react';
import {
  LogOut,
  UserCheck,
  Sparkles,
  Cloud,
  HardDrive,
  Check,
  ChevronDown,
  Plus,
  Trash2,
} from 'lucide-react';
import { LazyAvatar } from '@/components/LazyAvatar';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { useLocalAuthStore, AVATAR_PRESETS } from '@/store/localAuthStore';
import { useWeatherStore } from '@/store/weatherStore';
import { toastError, toastSuccess } from '@/store/toastStore';
import { cn } from '@/lib/utils';

/** Xoá tài khoản + dữ liệu trên máy chủ (CH Play bắt buộc có trong app) */
async function deleteMyAccount() {
  const user = useAuthStore.getState().user;
  if (!user) return;
  const ok = window.confirm(
    'Xoá vĩnh viễn tài khoản này?\n\n' +
      '• Lịch đã đồng bộ, hồ sơ, danh sách bạn thân và kỷ niệm chung trên máy chủ sẽ bị xoá, không khôi phục được.\n' +
      '• Dữ liệu chỉ lưu trên máy này (kỷ niệm riêng, đếm ngược) vẫn giữ nguyên.'
  );
  if (!ok) return;
  if (!window.confirm('Chắc chắn chưa? Bấm OK để xoá ngay.')) return;

  try {
    if (user.isLocal) {
      const local = useLocalAuthStore.getState();
      useLocalAuthStore.setState({ accounts: local.accounts.filter((a) => a.uid !== user.uid) });
    } else {
      const { deleteFirebaseAccount } = await import('@/firebase/deleteAccount');
      await deleteFirebaseAccount();
    }
    await useAuthStore.getState().signOut();
    toastSuccess('Đã xoá tài khoản 👋');
  } catch (e) {
    toastError('Chưa xoá được tài khoản', e instanceof Error ? e.message : undefined);
  }
}

export function UserProfileDropdown() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const authMode = useAuthStore((s) => s.authMode);
  const accounts = useLocalAuthStore((s) => s.accounts);
  const switchAccount = useLocalAuthStore((s) => s.switchAccount);
  const openAuthModal = useLocalAuthStore((s) => s.openAuthModal);
  const updateProfile = useLocalAuthStore((s) => s.updateProfile);
  const openWeatherModal = useWeatherStore((s) => s.openModal);

  const [isOpen, setIsOpen] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Người dùng';
  const initial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowAvatarPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return (
      <Button
        size="sm"
        onClick={() => openAuthModal('login')}
        className="gap-1.5 rounded-full bg-gradient-to-r from-primary to-indigo-600 px-3.5 font-semibold text-white shadow-md transition-all hover:scale-105 hover:shadow-lg"
      >
        <Sparkles className="h-4 w-4 text-amber-300" />
        <span>Đăng nhập</span>
      </Button>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-full p-1 transition-all hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-primary/40',
          isOpen && 'bg-muted ring-2 ring-primary/30'
        )}
        aria-expanded={isOpen}
        aria-label="Tùy chọn tài khoản"
      >
        <LazyAvatar
          src={user.photoURL ?? undefined}
          alt={displayName}
          fallback={initial}
          size="sm"
        />
        <span className="hidden max-w-[120px] truncate text-xs font-semibold 2xl:inline">
          {displayName}
        </span>
        <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground 2xl:inline" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 origin-top-right rounded-2xl border bg-card p-3 shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95">
          {/* User Info Card */}
          <div className="flex items-center gap-3 border-b pb-3">
            <div className="relative">
              <LazyAvatar
                src={user.photoURL ?? undefined}
                alt={displayName}
                fallback={initial}
                size="md"
              />
              <button
                type="button"
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-white shadow-xs hover:bg-primary/90"
                title="Đổi avatar"
              >
                ✏️
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-bold">{displayName}</p>
              </div>
              <p className="truncate text-xs text-muted-foreground">{user.email ?? 'Khách'}</p>
              <div className="mt-1 flex items-center gap-1">
                {authMode === 'firebase' ? (
                  <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                    <Cloud className="h-3 w-3" /> Firebase Cloud
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                    <HardDrive className="h-3 w-3" /> Cục bộ (Local Active)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Avatar Picker */}
          {showAvatarPicker && (
            <div className="border-b py-2">
              <p className="mb-1 text-[11px] font-medium text-muted-foreground">Chọn avatar:</p>
              <div className="flex flex-wrap gap-1.5">
                {AVATAR_PRESETS.map((av, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      updateProfile({ photoURL: av });
                      setShowAvatarPicker(false);
                      toastSuccess('Đã đổi avatar!');
                    }}
                    className={cn(
                      'relative h-8 w-8 overflow-hidden rounded-full border transition-transform hover:scale-110',
                      user.photoURL === av && 'border-primary ring-2 ring-primary/40'
                    )}
                  >
                    <img src={av} alt="Avatar" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Switch accounts quick list */}
          <div className="py-2">
            <div className="mb-1.5 flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Tài khoản trên máy
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  openAuthModal('register');
                }}
                className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                <Plus className="h-3 w-3" /> Thêm
              </button>
            </div>

            <div className="space-y-1">
              {accounts.map((acc) => {
                const isSelected = acc.uid === user.uid;
                return (
                  <button
                    key={acc.uid}
                    type="button"
                    onClick={() => {
                      switchAccount(acc.uid);
                      setIsOpen(false);
                      toastSuccess(`Đã chuyển sang ${acc.displayName}`);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/80',
                      isSelected && 'bg-primary/10 font-semibold text-primary'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <img
                        src={acc.photoURL || AVATAR_PRESETS[0]}
                        alt={acc.displayName}
                        className="h-6 w-6 rounded-full object-cover"
                      />
                      <span className="truncate">{acc.displayName}</span>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-1 border-t pt-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                openWeatherModal();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Thời tiết & Trợ lý AI</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                openAuthModal('login');
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <UserCheck className="h-4 w-4 text-indigo-500" />
              <span>Đăng nhập tài khoản khác</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                setIsOpen(false);
                await signOut();
                toastSuccess('Đã đăng xuất');
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              <span>Đăng xuất</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                setIsOpen(false);
                await deleteMyAccount();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Xoá tài khoản</span>
            </button>
            <a
              href="/privacy.html"
              target="_blank"
              rel="noopener"
              className="block px-2 pt-1 text-[10px] text-muted-foreground underline-offset-2 hover:underline"
            >
              Chính sách quyền riêng tư
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
