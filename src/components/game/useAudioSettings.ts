'use client';

import { useMemo, useSyncExternalStore } from 'react';

interface AudioSettings {
  selectionVolume: number;
  sfxVolume: number;
  bgmVolume: number;
  isMuted: boolean;
}

const KEY = 'vampire_survivors_2d_audio';
const DEFAULTS: AudioSettings = { selectionVolume: 0.5, sfxVolume: 0.5, bgmVolume: 0.5, isMuted: false };
let snapshot: string | null | undefined;
const listeners = new Set<() => void>();

function getSnapshot(): string | null {
  if (typeof window === 'undefined') return null;
  if (snapshot === undefined) {
    try { snapshot = window.localStorage.getItem(KEY); } catch { snapshot = null; }
  }
  return snapshot;
}

function normalize(raw: string | null): AudioSettings {
  try {
    const data = raw ? JSON.parse(raw) : null;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return DEFAULTS;
    const volume = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
      ? Math.max(0, Math.min(1, value)) : 0.5;
    return { selectionVolume: volume(data.selectionVolume), sfxVolume: volume(data.sfxVolume),
      bgmVolume: volume(data.bgmVolume), isMuted: typeof data.isMuted === 'boolean' ? data.isMuted : false };
  } catch { return DEFAULTS; }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) { snapshot = event.newValue; listener(); }
  };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage); };
}

export function updateAudioSettings(patch: Partial<AudioSettings>): void {
  snapshot = JSON.stringify(normalize(JSON.stringify({ ...normalize(getSnapshot()), ...patch })));
  // Keep the session responsive even when storage is unavailable/full.
  try { window.localStorage.setItem(KEY, snapshot); } catch { /* session-only preference */ }
  for (const listener of listeners) listener();
}

export function useAudioSettings(): AudioSettings {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null);
  return useMemo(() => normalize(raw), [raw]);
}
