import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

// Tránh SW cache làm trắng màn hình khi chạy localhost/preview.
// SW chỉ bật khi deploy domain thật (PROD + không phải localhost).
if (
  import.meta.env.PROD &&
  typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // auto update để tránh lệch hash chunk giữa các lần deploy
      updateSW(true);
    },
    onOfflineReady() {
      console.info('[PWA] Sẵn sàng hoạt động offline');
    },
    onRegisteredSW(swUrl, registration) {
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      console.info('[PWA] Service Worker đã đăng ký:', swUrl);
    },
  });
} else {
  // Nếu đã từng đăng ký SW trước đó trên localhost, cố gắng gỡ để tránh cache sai.
  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => void r.unregister());
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
