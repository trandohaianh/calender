# Đưa MyCalendar lên CH Play

Phần code đã sẵn sàng:
- Capacitor 8, nhắm API 36 (Android 16), chạy từ Android 7 (API 24).
- Mã gói `com.trandohaianh.mycalendar`.
- Icon và màn chờ kẹo hồng, có cả chế độ tối.
- Nút **Xoá tài khoản** trong app.
- Trang chính sách tại `/privacy.html`.

Các bước bên dưới là việc **bạn phải tự làm**, vì cần tài khoản, mật khẩu và giấy tờ của bạn.

---

## 0. Kiểm tra mã gói (chỉ làm một lần)

`com.trandohaianh.mycalendar` **không đổi được** sau lần tải lên đầu tiên. Nếu muốn tên khác, sửa ở cả hai chỗ trước khi tải lên:
- `capacitor.config.ts` → `appId`
- `android/app/build.gradle` → `namespace` và `applicationId`

Sau đó chạy `npx cap sync android`.

## 1. Cài công cụ

| Công cụ | Ghi chú |
|---|---|
| Android Studio (bản mới nhất) | Có sẵn JDK 21 và Android SDK. Máy hiện có Java 8, quá cũ, không build được |
| Android SDK Platform 36 | Android Studio → SDK Manager |

## 2. Thử trên điện thoại

```powershell
npm run build:android
```

Lệnh này build web, đồng bộ sang Android và mở Android Studio. Cắm điện thoại (bật *Gỡ lỗi USB*) rồi bấm ▶ Run.

Những thứ cần thử:
- đăng nhập,
- nhắc lịch (đặt sự kiện sau 2 phút),
- thời tiết theo vị trí,
- chế độ tối,
- thanh trạng thái không che nội dung,
- nút Back.

## 3. Tạo khoá ký (giữ cẩn thận, mất là không cập nhật app được nữa)

```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair -v -keystore D:\cale\mycalendar-release.jks -alias mycalendar -keyalg RSA -keysize 2048 -validity 10000
```

Bước tiếp theo:
1. Sao chép `android/keystore.properties.example` thành `android/keystore.properties`.
2. Điền mật khẩu vào file đó. Git đã được đặt để bỏ qua `keystore.properties` và `*.jks`.
3. Sao lưu file `.jks` và mật khẩu ra một nơi khác, ví dụ USB hoặc trình quản lý mật khẩu.

## 4. Build bản phát hành (.aab)

```powershell
npm run build:android:release
```

File ra: `android/app/build/outputs/bundle/release/app-release.aab`

Mỗi lần cập nhật, sửa `android/app/build.gradle`:
- `versionCode`: tăng thêm 1,
- `versionName`: ví dụ `1.0.1`.

## 5. Firebase cho bản Android

Đăng nhập Google trên Android cần thêm vân tay SHA-1. Làm như sau:

1. Lấy vân tay SHA-1 của khoá upload:
   `keytool -list -v -keystore D:\cale\mycalendar-release.jks -alias mycalendar`
2. Firebase Console → Project settings → **Add app → Android**, mã gói `com.trandohaianh.mycalendar`, dán SHA-1.
3. Sau khi lên Play Console, thêm cả SHA-1 trong *Play Console → Kiểm tra và phát hành → Thiết lập → Tính toàn vẹn của ứng dụng*. Google ký lại app bằng khoá này.
4. Không cần `google-services.json`, vì app dùng Firebase JS SDK.

## 6. Đăng trang chính sách lên mạng

`public/privacy.html` sẽ được đăng cùng web lên Firebase Hosting. Làm như sau:

1. **Trước đó** mở file và thay `EMAIL_HO_TRO` bằng email hỗ trợ của bạn.
2. Chạy:
   ```powershell
   npm run deploy:firebase
   ```

Link để điền vào Play Console:
- Chính sách quyền riêng tư: `https://<tên-dự-án>.web.app/privacy.html`
- Xoá tài khoản: `https://<tên-dự-án>.web.app/privacy.html#xoa-tai-khoan`

## 7. Play Console

1. Đăng ký tài khoản nhà phát triển: 25 USD, xác minh danh tính bằng CCCD.
   Nếu là tài khoản **cá nhân**, phải chạy **thử nghiệm kín với ít nhất 12 người trong 14 ngày liên tục** rồi mới được phát hành chính thức.
2. Tạo ứng dụng: tên *MyCalendar*, ngôn ngữ mặc định Tiếng Việt, loại Ứng dụng, Miễn phí.
3. **Nội dung ứng dụng**:
   - Chính sách quyền riêng tư: dùng link ở bước 6.
   - Quyền truy cập: ghi chú rằng app dùng được không cần đăng nhập. Nếu reviewer cần thử tính năng Bạn thân, đưa họ một tài khoản test.
   - Quảng cáo: **Không**.
   - Xếp hạng nội dung: làm bảng câu hỏi, app lịch thường ra mức 3+.
   - Đối tượng: 13 tuổi trở lên.
   - **An toàn dữ liệu**, khai đúng như trang chính sách:
     - Thu thập email, tên, ảnh (tài khoản); sự kiện lịch (nội dung do người dùng tạo); vị trí gần đúng (thời tiết, không lưu); tin nhắn gửi AI; thống kê sử dụng (Analytics).
     - Dữ liệu được mã hoá khi truyền. Người dùng có thể yêu cầu xoá dữ liệu.
   - Báo thức chính xác: app dùng `SCHEDULE_EXACT_ALARM` để nhắc lịch, đây là trường hợp được phép.
4. **Trang thông tin**:
   - Icon 512×512: `public/icons/icon-512.png`.
   - Ảnh nổi bật 1024×500.
   - Ít nhất 2 ảnh chụp màn hình điện thoại.
   - Mô tả ngắn (80 ký tự) và mô tả đầy đủ.
5. **Thử nghiệm kín**: tải `app-release.aab` lên, thêm email 12 người thử, gửi họ link tham gia. Sau 14 ngày, xin quyền phát hành chính thức.

## Tạo lại icon / màn chờ

Sửa `assets/icon-foreground.svg` hoặc `assets/icon-background.svg`, rồi chạy:

```powershell
npm run assets:generate
```
