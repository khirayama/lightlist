import { ExpoConfig, ConfigContext } from 'expo/config';

const APP_ENV = process.env.APP_ENV || 'development';

const getAppName = () => {
  if (APP_ENV === 'production') return 'Lightlist';
  if (APP_ENV === 'staging') return 'Lightlist (Staging)';
  return 'Lightlist (Dev)';
};

const getBundleId = () => {
  const baseId = 'com.lightlist.app';
  if (APP_ENV === 'production') return baseId;
  if (APP_ENV === 'staging') return `${baseId}.staging`;
  return `${baseId}.dev`;
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: getAppName(),
  slug: 'lightlist-native',
  version: '1.0.0',
  orientation: 'default',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  scheme: 'lightlist',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: getBundleId(),
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: getBundleId(),
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  plugins: ['expo-font'],
  extra: {
    APP_ENV,
    eas: {
      projectId: "ea845607-4e78-4394-918b-c99da03df774" // Placeholder, will be updated by eas init/build
    }
  },
});
