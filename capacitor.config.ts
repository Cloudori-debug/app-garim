import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.clowood.amginote',
  appName: '가림 암기노트',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
