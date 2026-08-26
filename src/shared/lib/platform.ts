import { Capacitor } from '@capacitor/core'

/** Capacitor iOS/Android 셸에서 실행 중이면 true. 웹·PWA는 false. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}
