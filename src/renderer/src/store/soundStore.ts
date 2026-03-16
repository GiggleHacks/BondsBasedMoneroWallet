import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SoundKey =
  | 'startup'
  | 'click'
  | 'receive'
  | 'send'
  | 'testNodes'
  | 'revealSeed'
  | 'spinModel'

export interface SoundMeta {
  label: string
  description: string
  file: string
}

export const SOUND_META: Record<SoundKey, SoundMeta> = {
  startup:    { label: 'App Startup',        description: 'Plays when the app launches',               file: 'startup3.mp3'   },
  click:      { label: 'Button Click',       description: 'Plays on every button or link press',       file: 'clicky2.mp3'    },
  receive:    { label: 'Money Received',     description: 'Plays when a new incoming payment arrives', file: 'money.mp3'      },
  send:       { label: 'Transaction Sent',   description: 'Plays after a successful XMR send',         file: 'sound1.mp3'     },
  testNodes:  { label: 'Test All Nodes',     description: 'Plays when running the node speed test',    file: 'fffsend.mp3'    },
  revealSeed: { label: 'Reveal Seed Phrase', description: 'Plays when the recovery seed is revealed',  file: 'alertseed.wav'  },
  spinModel:  { label: '3D Model Spin',      description: 'Plays when spinning the sidebar model fast',file: 'thatsgoodsmall.wav'},
}

interface SoundState {
  masterEnabled: boolean
  sounds: Record<SoundKey, boolean>
  setMaster: (enabled: boolean) => void
  setSound: (key: SoundKey, enabled: boolean) => void
}

const DEFAULT_SOUNDS: Record<SoundKey, boolean> = {
  startup:    true,
  click:      true,
  receive:    true,
  send:       true,
  testNodes:  true,
  revealSeed: true,
  spinModel:  true,
}

export const useSoundStore = create<SoundState>()(
  persist(
    (set) => ({
      masterEnabled: true,
      sounds: { ...DEFAULT_SOUNDS },
      setMaster: (enabled) => set({ masterEnabled: enabled }),
      setSound: (key, enabled) =>
        set((s) => ({ sounds: { ...s.sounds, [key]: enabled } })),
    }),
    { name: 'monero-wallet-sounds' }
  )
)

/** Returns true if the given sound should play right now */
export function isSoundEnabled(key: SoundKey): boolean {
  const { masterEnabled, sounds } = useSoundStore.getState()
  return masterEnabled && sounds[key]
}
