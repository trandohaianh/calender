# Hướng dẫn build Android APK / AAB — MyCalendar

## Yêu cầu

| Công cụ | Phiên bản gợi ý |
|---------|------------------|
| Node.js | 18+ |
| JDK | 17 (Android Studio embedded) |
| Android Studio | Hedgehog+ |
| Android SDK | API 34 (compileSdk) |

---

## 1. Cấu hình lần đầu

### 1.1 Đổi Application ID

Trong `capacitor.config.ts`:

```ts
appId: 'com.yourname.mycalendar',  // → com.tenban.mycalendar
```

Đồng bộ `android/app/build.gradle` → `applicationId` sau `cap sync`.

### 1.2 Cài dependencies

```bash
cd calendar-app
npm install
```

Plugins đã khai báo:

- `@capacitor/push-notifications`
- `@capacitor/local-notifications`
- `@capacitor/haptics`
- `@capacitor/status-bar`
- `@capacitor/splash-screen`
- `@capacitor/network`
- `@capacitor/app` (hardware back)

### 1.3 Tạo project Android (lần đầu)

```bash
npm run build
npx cap add android    # chỉ chạy 1 lần nếu chưa có thư mục android/
npx cap sync android
```

Sau `cap add android`, **merge** nội dung từ repo:

- `android/app/src/main/AndroidManifest.xml` (permissions, deeplinks, receivers)
- `android/app/src/main/res/**` (adaptive icon, notification icon)

Hoặc copy thủ công các block `<uses-permission>`, `<intent-filter>`, receivers vào manifest do Capacitor generate.

### 1.4 Icon & splash

1. Copy `public/icons/icon-512.png` → dùng [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/) tạo mipmap.
2. Đặt vào `android/app/src/main/res/mipmap-*`.
3. Splash: `android/app/src/main/res/drawable/splash.png` (2732×2732 khuyến nghị) hoặc dùng plugin SplashScreen.

---

## 2. Scripts npm

| Lệnh | Mô tả |
|------|--------|
| `npm run build:web` | Chỉ build Vite → `dist/` |
| `npm run build:android` | Build web + sync + mở Android Studio |
| `npm run build:android:release` | Build web + sync (không mở IDE) |
| `npm run deploy:firebase` | Deploy PWA lên Firebase Hosting |

```bash
npm run build:android
```

---

## 3. Keystore signing (release)

### 3.1 Tạo keystore

```bash
keytool -genkey -v -keystore mycalendar-release.keystore -alias mycalendar -keyalg RSA -keysize 2048 -validity 10000
```

Lưu file **ngoài** repo. Thêm vào `.gitignore`:

```
*.keystore
keystore.properties
```

### 3.2 `android/keystore.properties` (local only)

```properties
storeFile=../mycalendar-release.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=mycalendar
keyPassword=YOUR_KEY_PASSWORD
```

### 3.3 `android/app/build.gradle` (thêm cuối file)

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## 4. Build release AAB / APK

Trong Android Studio:

**Build → Generate Signed Bundle / APK → Android App Bundle (AAB)** — khuyến nghị CH Play.

Hoặc CLI:

```bash
cd android
./gradlew bundleRelease          # AAB → app/build/outputs/bundle/release/
./gradlew assembleRelease        # APK → app/build/outputs/apk/release/
```

Windows:

```powershell
cd android
.\gradlew.bat bundleRelease
```

---

## 5. Deeplinks

| URL | Ví dụ |
|-----|--------|
| HTTPS App Link | `https://app.mycalendar.local/event/abc123` |
| Custom scheme | `mycalendar://event/abc123` |

Xử lý trong app (`src/hooks/useDeepLinks.ts` — tùy triển khai):

```ts
import { App } from '@capacitor/app';
App.addListener('appUrlOpen', ({ url }) => { /* parse & open event */ });
```

**App Links verify:** host `app.mycalendar.local` cần file `/.well-known/assetlinks.json` trên domain thật khi publish.

---

## 6. Push Notifications (FCM) — tùy chọn

1. Tạo project Firebase → thêm app Android (package `com.yourname.mycalendar`).
2. Tải `google-services.json` → `android/app/google-services.json`.
3. `android/build.gradle`:

```gradle
classpath 'com.google.gms:google-services:4.4.2'
```

4. `android/app/build.gradle` (cuối file):

```gradle
apply plugin: 'com.google.gms.google-services'
```

---

## 7. Checklist Google Play Console

### 7.1 Assets bắt buộc

| Asset | Kích thước | Ghi chú |
|-------|-----------|---------|
| App icon | 512×512 PNG | High-res icon |
| Feature graphic | 1024×500 | Banner store |
| Phone screenshots | ≥2 | 1080×1920 khuyến nghị — dùng `public/screenshots/` |
| Short description | ≤80 ký tự | |
| Full description | ≤4000 ký tự | |

### 7.2 Store listing (điền đủ)

- **App name:** MyCalendar
- **Category:** Productivity
- **Contact email:** email hỗ trợ
- **Privacy policy URL:** bắt buộc (host trên Firebase / website)
- **Data safety:** khai báo Firebase Auth, Firestore, notifications
- **Content rating:** questionnaire IARC
- **Target audience:** 13+ / All ages
- **Countries:** chọn khu vực phân phối

### 7.3 Release

1. **Internal testing** → upload AAB, thêm tester emails.
2. **Closed / Open testing** (khuyến nghị).
3. **Production** → rollout % hoặc full.

### 7.4 Trước khi submit

- [ ] Đổi `appId` khỏi `com.yourname.*`
- [ ] Test offline, notifications, back button
- [ ] `versionCode` / `versionName` tăng trong `android/app/build.gradle`
- [ ] ProGuard (nếu bật minify) — test release build
- [ ] Không commit keystore / passwords

---

## 8. Hardware back (đã tích hợp)

Thứ tự xử lý trong `useCapacitorInit`:

1. Đóng Event Modal  
2. Đóng Sidebar mobile  
3. `App.exitApp()`

---

## 9. Troubleshooting

| Lỗi | Cách xử lý |
|-----|------------|
| Gradle sync fail | File → Invalidate Caches; JDK 17 |
| WebView trắng | `npm run build` trước `cap sync` |
| Notifications không hiện | Android 13+: cấp POST_NOTIFICATIONS; kiểm tra battery optimization |
| Deeplink không mở app | Verify intent-filter; test `adb shell am start -a android.intent.action.VIEW -d "mycalendar://event/1"` |

```bash
adb shell am start -a android.intent.action.VIEW -d "mycalendar://event/test"
```
