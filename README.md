# MyCalendar — Production-ready Calendar PWA

React 18 + Vite + TypeScript + Zustand + Firebase + PWA + Capacitor 5.

## Stack

| Layer | Công nghệ |
|-------|-----------|
| UI | React 18, TailwindCSS, shadcn/ui |
| State | Zustand |
| Backend | Firebase Auth + Firestore |
| PWA | `vite-plugin-pwa` (offline, SW, manifest) |
| Mobile | Capacitor 5 (Android APK) |
| Dates | date-fns |
| DnD | react-beautiful-dnd |

## Cấu trúc thư mục

```
calendar-app/
├── src/
│   ├── components/
│   │   ├── CalendarGrid/     # Month / Week / Day
│   │   ├── EventModal/
│   │   ├── Sidebar/
│   │   ├── Header/
│   │   ├── AgendaView/
│   │   └── ui/               # shadcn primitives
│   ├── hooks/
│   │   ├── useEvents.ts
│   │   ├── useCalendars.ts
│   │   ├── useNotifications.ts
│   │   └── useAuth.ts
│   ├── store/calendarStore.ts
│   ├── firebase/
│   │   ├── config.ts
│   │   └── services/
│   └── App.tsx
├── public/manifest.json
├── android/                  # sau `cap add android`
├── vite.config.ts
├── capacitor.config.ts
└── tailwind.config.ts
```

## Bắt đầu nhanh

```bash
cd calendar-app
cp .env.example .env
# Điền Firebase credentials vào .env

npm install
powershell -ExecutionPolicy Bypass -File scripts/generate-icons.ps1
powershell -ExecutionPolicy Bypass -File scripts/generate-screenshots.ps1

npm run dev
```

## Firebase

1. Tạo project trên [Firebase Console](https://console.firebase.google.com)
2. Bật **Authentication → Anonymous**
3. Tạo **Firestore** database
4. Deploy rules: `firebase deploy --only firestore:rules`
5. Copy config vào `.env` (prefix `VITE_`)

## PWA

- Manifest: `public/manifest.json` + đồng bộ trong `vite.config.ts`
- `theme_color`: `#1a73e8`
- Icons: `public/icons/icon-192.png`, `icon-512.png`
- Screenshots CH Play: `public/screenshots/*.png`

## Capacitor Android

```bash
npm run build
npx cap add android   # lần đầu
npx cap sync
npm run cap:android
```

## Deploy Hosting

```bash
npm run build
firebase deploy --only hosting
```

## Scripts

| Lệnh | Mô tả |
|------|--------|
| `npm run dev` | Dev server :5173 |
| `npm run build` | Production build → `dist/` |
| `npm run cap:sync` | Sync web → native |
| `npm run firebase:deploy` | Build + deploy hosting |
