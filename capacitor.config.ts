import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aspirant.app',
  appName: 'aspirant-client',
  webDir: 'build',
  plugins: {
    extConfig: {},
    CapacitorUpdater: {
      appId: 'com.aspirant.app'
    }
  }
};

export default config;
