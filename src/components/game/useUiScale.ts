'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'vs2d_ui_scale';
const MIN_SCALE = 0.8;
const MAX_SCALE = 1.3;
const EVENT_NAME = 'vs2d-ui-scale-change';

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(value * 100) / 100));
}

function readScale(): number {
  if (typeof window === 'undefined') return 1;
  try {
    return clamp(parseFloat(window.localStorage.getItem(STORAGE_KEY) ?? '1'));
  } catch {
    return 1;
  }
}

function writeScale(value: number): void {
  if (typeof window === 'undefined') return;
  const next = clamp(value);
  try {
    window.localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // Private mode / quota errors must never break the game.
  }
  window.dispatchEvent(new Event(EVENT_NAME));
}

/**
 * Scales the in-run HUD only (menus stay at their designed size). Persisted in
 * localStorage so small and 4K screens keep their preferred size between runs.
 */
export function useUiScale(): { uiScale: number; setUiScale: (value: number) => void } {
  const [uiScale, setScale] = useState(1);

  useEffect(() => {
    const sync = () => setScale(readScale());
    sync();
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return { uiScale, setUiScale: writeScale };
}

export const UI_SCALE_LIMITS = { min: MIN_SCALE, max: MAX_SCALE };
