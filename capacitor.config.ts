import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.clowood.amginote',
  appName: '가림 암기노트',
  webDir: 'dist',
  backgroundColor: '#0F766E',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0F766E',
  },
}

export default config
