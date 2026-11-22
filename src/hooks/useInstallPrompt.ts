import { useCallback, useEffect, useState } from 'react';

const DISMISS_KEY = 'mycalendar-install-dismissed';
const DELAY_MS = 30_000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Bắt beforeinstallprompt, hiện banner cài đặt sau 30s.
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === '1') return;
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', onBip);

    const timer = setTimeout(() => {
      if (!localStorage.getItem(DISMISS_KEY)) {
        setShowBanner(true);
      }
    }, DELAY_MS);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      clearTimeout(timer);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowBanner(false);
    if (outcome === 'accepted') setIsInstalled(true);
    return outcome === 'accepted';
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, '1');
    setShowBanner(false);
  }, []);

  const canInstall = !!deferredPrompt && !isInstalled;

  return {
    showBanner: showBanner && canInstall,
    canInstall,
    install,
    dismiss,
    isInstalled,
  };
}
