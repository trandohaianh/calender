import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Đổi appId trước khi publish CH Play:
 * com.yourname.mycalendar → com.tenban.mycalendar
 */
const config: CapacitorConfig = {
  appId: 'com.yourname.mycalendar',
  appName: 'MyCalendar',
  webDir: 'dist',

  server: {
    androidScheme: 'https',
    hostname: 'app.mycalendar.local',
  },

  android: {
    allowMixedContent: false,
    backgroundColor: '#1a73e8',
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'AAB',
    },
  },

  plugins: {
  SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1a73e8',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#1a73e8',
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#1a73e8',
      sound: 'beep.wav',
    },
  },
};

export default config;
