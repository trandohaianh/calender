import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  X,
  LogIn,
  UserPlus,
  Sparkles,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  Check,
  Lock,
  Mail,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import {
  useLocalAuthStore,
  AVATAR_PRESETS,
} from '@/store/localAuthStore';
import { toastSuccess, toastError } from '@/store/toastStore';
import { cn } from '@/lib/utils';

export function AuthModal() {
  const isOpen = useLocalAuthStore((s) => s.isAuthModalOpen);
  const tab = useLocalAuthStore((s) => s.authModalTab);
  const closeAuthModal = useLocalAuthStore((s) => s.closeAuthModal);
  const openAuthModal = useLocalAuthStore((s) => s.openAuthModal);
  const quickLoginDemo = useLocalAuthStore((s) => s.quickLoginDemo);
  const accounts = useLocalAuthStore((s) => s.accounts);

  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInAnonymously,
    loading,
    error,
    clearError,
  } = useAuthStore();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toastError('Vui lòng nhập email');
      return;
    }
    setIsSubmitting(true);
    clearError();
    try {
      await signInWithEmail(email.trim(), password);
      toastSuccess('Đăng nhập thành công!');
      closeAuthModal();
      setEmail('');
      setPassword('');
    } catch (err) {
      toastError('Đăng nhập thất bại', err instanceof Error ? err.message : undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !displayName.trim()) {
      toastError('Vui lòng điền đủ họ tên và email');
      return;
    }
    setIsSubmitting(true);
    clearError();
    try {
      await signUpWithEmail(email.trim(), password || '123456', displayName.trim());
      // Update avatar in local store
      useLocalAuthStore.getState().updateProfile({ photoURL: selectedAvatar });
      toastSuccess('Đăng ký tài khoản thành công!');
      closeAuthModal();
      setEmail('');
      setPassword('');
      setDisplayName('');
    } catch (err) {
      toastError('Đăng ký thất bại', err instanceof Error ? err.message : undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (uid: string) => {
    setIsSubmitting(true);
    try {
      await quickLoginDemo(uid);
      toastSuccess('Đã chuyển sang tài khoản mẫu!');
      closeAuthModal();
    } catch (err) {
      toastError('Không thể đăng nhập tài khoản mẫu', err instanceof Error ? err.message : undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuest = async () => {
    setIsSubmitting(true);
    try {
      await signInAnonymously();
      toastSuccess('Đang dùng chế độ Khách (Guest)');
      closeAuthModal();
    } catch (err) {
      toastError('Lỗi chế độ khách', err instanceof Error ? err.message : undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      toastSuccess('Đăng nhập Google thành công!');
      closeAuthModal();
    } catch (err) {
      toastError('Lỗi đăng nhập Google', err instanceof Error ? err.message : undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && closeAuthModal()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-[460px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border bg-card/95 p-0 shadow-2xl backdrop-blur-xl duration-200 animate-in fade-in-0 zoom-in-95'
          )}
        >
          {/* Header Gradient */}
          <div className="relative overflow-hidden bg-gradient-to-br from-primary/90 via-indigo-600 to-purple-600 px-6 py-6 text-white">
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 shadow-inner backdrop-blur-md">
                  <Sparkles className="h-6 w-6 text-amber-300" />
                </div>
                <div>
                  <DialogPrimitive.Title className="text-lg font-bold">
                    MyCalendar Account
                  </DialogPrimitive.Title>
                  <p className="text-xs text-white/80">
                    Đồng bộ lịch trình, thời tiết & trợ lý AI cá nhân
                  </p>
                </div>
              </div>
              <DialogPrimitive.Close className="rounded-full bg-white/10 p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white">
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>

            {/* Subtle background glow */}
            <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b bg-muted/40 p-1.5">
            <button
              type="button"
              onClick={() => {
                clearError();
                openAuthModal('login');
              }}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all',
                tab === 'login'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LogIn className="h-3.5 w-3.5" />
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => {
                clearError();
                openAuthModal('register');
              }}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all',
                tab === 'register'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Đăng ký mới
            </button>
            <button
              type="button"
              onClick={() => {
                clearError();
                openAuthModal('demo');
              }}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all',
                tab === 'demo'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <UserCheck className="h-3.5 w-3.5" />
              Tài khoản mẫu
            </button>
          </div>

          <div className="max-h-[75vh] overflow-y-auto p-6">
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <p className="flex-1">{error}</p>
              </div>
            )}

            {/* TAB 1: LOGIN */}
            {tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email" className="text-xs font-medium">
                    Email đăng nhập
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      required
                      placeholder="admin@mycalendar.vn hoặc email của bạn"
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-pass" className="text-xs font-medium">
                      Mật khẩu
                    </Label>
                    <span className="text-[11px] text-muted-foreground">Mặc định: 123</span>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="login-pass"
                      type="password"
                      placeholder="••••••••"
                      className="pl-9"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full font-semibold shadow-md"
                  disabled={isSubmitting || loading}
                >
                  {isSubmitting ? 'Đang xác thực...' : 'Đăng nhập ngay'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <div className="relative my-4 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <span className="relative bg-card px-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                    Hoặc đăng nhập nhanh
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs font-medium"
                    onClick={handleGoogle}
                    disabled={isSubmitting}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    Google
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs font-medium"
                    onClick={handleGuest}
                    disabled={isSubmitting}
                  >
                    👤 Khách (Guest)
                  </Button>
                </div>
              </form>
            )}

            {/* TAB 2: REGISTER */}
            {tab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-name" className="text-xs font-medium">
                    Họ và tên
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="reg-name"
                      required
                      placeholder="Nguyễn Văn A"
                      className="pl-9"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-email" className="text-xs font-medium">
                    Email tài khoản
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="reg-email"
                      type="email"
                      required
                      placeholder="ban@example.com"
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-pass" className="text-xs font-medium">
                    Mật khẩu
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="reg-pass"
                      type="password"
                      placeholder="Tối thiểu 6 ký tự"
                      className="pl-9"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Chọn ảnh đại diện</Label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {AVATAR_PRESETS.map((av, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedAvatar(av)}
                        className={cn(
                          'relative h-11 w-11 overflow-hidden rounded-full border-2 transition-all',
                          selectedAvatar === av
                            ? 'border-primary ring-2 ring-primary/30 scale-105'
                            : 'border-transparent opacity-70 hover:opacity-100'
                        )}
                      >
                        <img src={av} alt="Avatar" className="h-full w-full object-cover" />
                        {selectedAvatar === av && (
                          <div className="absolute inset-0 flex items-center justify-center bg-primary/40 text-white">
                            <Check className="h-4 w-4 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full font-semibold shadow-md bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản & Bắt đầu'}
                </Button>
              </form>
            )}

            {/* TAB 3: DEMO ACCOUNTS */}
            {tab === 'demo' && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Chọn một tài khoản mẫu có sẵn để trải nghiệm ngay mọi tính năng với đầy đủ lịch trình và dữ liệu:
                </p>

                <div className="space-y-2">
                  {accounts.map((acc) => (
                    <div
                      key={acc.uid}
                      onClick={() => handleDemoLogin(acc.uid)}
                      className="group flex cursor-pointer items-center justify-between rounded-xl border bg-muted/30 p-3 transition-all hover:border-primary hover:bg-primary/5 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={acc.photoURL || AVATAR_PRESETS[0]}
                          alt={acc.displayName}
                          className="h-10 w-10 rounded-full border object-cover shadow-xs"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold">{acc.displayName}</span>
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              {acc.email.includes('admin') ? 'VIP Lead' : 'Sáng tạo'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{acc.email}</p>
                          {acc.bio && (
                            <p className="text-[11px] text-muted-foreground/80 italic">"{acc.bio}"</p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="group-hover:bg-primary group-hover:text-primary-foreground"
                      >
                        Chọn
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
