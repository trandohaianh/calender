import type { CapacitorConfig } from '@capacitor/cli';

/**
 * appId = mã gói trên CH Play. KHÔNG đổi được sau lần tải lên đầu tiên,
 * nên nếu muốn tên khác thì đổi ngay bây giờ (và trong android/app/build.gradle).
 */
const BRAND = '#ec4899'; // hồng kẹo — khớp --primary
const PAPER = '#fdf4fb'; // nền sáng — khớp --background

const config: CapacitorConfig = {
  appId: 'com.trandohaianh.mycalendar',
  appName: 'MyCalendar',
  webDir: 'dist',

  server: {
    androidScheme: 'https',
    hostname: 'app.mycalendar.local',
  },

  android: {
    allowMixedContent: false,
    backgroundColor: PAPER,
    buildOptions: {
      // Mật khẩu keystore KHÔNG ghi ở đây — xem docs/CH_PLAY.md (keystore.properties)
      releaseType: 'AAB',
    },
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: PAPER,
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: BRAND,
    },
  },
};

export default config;
