import { isSoundEnabled, type SoundKey } from '@/store/soundStore'

/**
 * Play a sound asset URL if both master sounds and the individual sound are enabled.
 * @param src   The imported asset URL (e.g. `import url from '@/assets/sounds/foo.mp3'`)
 * @param key   The sound key used for per-sound toggle check
 * @param volume 0–1, defaults to 0.8
 */
export function playSound(src: string, key: SoundKey, volume = 0.8): void {
  if (!isSoundEnabled(key)) return
  const audio = new Audio(src)
  audio.volume = volume
  audio.play().catch(() => {})
}
