# Android — MyCalendar

## Quick start

```bash
cd ..
npm install
npm run build
npx cap add android    # lần đầu
npx cap sync android
npm run build:android
```

Chi tiết: [docs/ANDROID_BUILD.md](../docs/ANDROID_BUILD.md)

## Files quan trọng trong repo

| File | Mục đích |
|------|----------|
| `app/src/main/AndroidManifest.xml` | Permissions, deeplinks, FCM, Local Notifications |
| `app/src/main/res/mipmap-anydpi-v26/` | Adaptive launcher icon |
| `app/src/main/res/drawable/ic_stat_icon_config_sample.xml` | Notification small icon |

Sau `cap add android`, so sánh manifest generated với bản trong repo và merge thủ công nếu cần.
