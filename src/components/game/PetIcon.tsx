'use client';

import React, { useSyncExternalStore } from 'react';
import { Bird, Bug, PawPrint } from 'lucide-react';
import { Enemy } from '@/game/entities/Enemy';
import type { EnemyType } from '@/game/types';
import type { Camera } from '@/game/engine/Camera';

const PET_BIRD_TYPES = new Set(['toucan', 'blue_butterfly', 'cicada', 'bat']);
const PET_BUG_TYPES = new Set([
  'bullet_ant',
  'leafcutter_ant',
  'rhino_beetle',
  'sawyer_beetle',
  'giant_centipede',
  'praying_mantis',
  'stick_bug',
  'elite_goliath_spider',
]);

/** In-memory cache so each creature is rendered to canvas at most once per session. */
const petDataUrlCache = new Map<string, string>();

const emptySubscribe = () => () => {};

/**
 * Renders a high-resolution, centered thumbnail of any tameable enemy creature
 * directly from its canonical procedural drawing code in Enemy.ts.
 */
export function getPetIconDataUrl(type: string): string | null {
  if (typeof window === 'undefined') return null;
  const cached = petDataUrlCache.get(type);
  if (cached) return cached;

  try {
    const scratchSize = 180;
    const scratchCanvas = document.createElement('canvas');
    scratchCanvas.width = scratchSize;
    scratchCanvas.height = scratchSize;
    const sCtx = scratchCanvas.getContext('2d', { willReadFrequently: true });
    if (!sCtx) return null;

    const enemy = new Enemy(0, type as EnemyType, 0, 0);
    enemy.isElite = false;
    enemy.isBoss = false;
    // Set a natural pose timer: wings slightly open, legs stepped
    enemy.animTimer = 0.8;

    const mockCamera = {
      x: 100, // this.x (0) < camera.x (100) -> flip = 1 (facing right)
      y: 0,
      isInView: () => true,
      worldToScreen: () => ({ x: scratchSize / 2, y: scratchSize / 2 }),
    } as unknown as Camera;

    enemy.render(sCtx, mockCamera);

    // Read bounding box of drawn pixels to auto-center and scale
    const imgData = sCtx.getImageData(0, 0, scratchSize, scratchSize);
    const data = imgData.data;
    let minX = scratchSize;
    let minY = scratchSize;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < scratchSize; y++) {
      const rowOffset = y * scratchSize;
      for (let x = 0; x < scratchSize; x++) {
        const alpha = data[(rowOffset + x) * 4 + 3];
        if (alpha > 15) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const outSize = 64;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = outSize;
    outCanvas.height = outSize;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return null;

    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';

    if (maxX >= minX && maxY >= minY) {
      const bWidth = maxX - minX + 1;
      const bHeight = maxY - minY + 1;
      const padding = 5;
      const targetBox = outSize - padding * 2;
      const scale = Math.min(targetBox / bWidth, targetBox / bHeight);

      const destW = Math.round(bWidth * scale);
      const destH = Math.round(bHeight * scale);
      const destX = Math.round((outSize - destW) / 2);
      const destY = Math.round((outSize - destH) / 2);

      outCtx.drawImage(
        scratchCanvas,
        minX,
        minY,
        bWidth,
        bHeight,
        destX,
        destY,
        destW,
        destH
      );
    } else {
      // Fallback: draw directly centered
      outCtx.drawImage(
        scratchCanvas,
        (outSize - scratchSize) / 2,
        (outSize - scratchSize) / 2
      );
    }

    const dataUrl = outCanvas.toDataURL('image/png');
    petDataUrlCache.set(type, dataUrl);
    return dataUrl;
  } catch (err) {
    console.error(`[PetIcon] Failed to generate icon for ${type}:`, err);
    return null;
  }
}

export function renderFallbackPetIcon(
  type: string,
  sizeClass: string = 'h-6 w-6'
): React.ReactNode {
  if (PET_BIRD_TYPES.has(type)) return <Bird className={`${sizeClass} text-lime-300`} />;
  if (PET_BUG_TYPES.has(type)) return <Bug className={`${sizeClass} text-amber-300`} />;
  return <PawPrint className={`${sizeClass} text-emerald-300`} />;
}

export interface PetIconProps {
  type: string;
  name?: string;
  className?: string;
}

export const PetIcon: React.FC<PetIconProps> = ({
  type,
  name,
  className = 'h-6 w-6',
}) => {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const dataUrl = isClient ? getPetIconDataUrl(type) : null;

  if (dataUrl) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={dataUrl}
        alt={name ?? type}
        className={`${className} object-contain pointer-events-none select-none`}
        loading="lazy"
        draggable={false}
      />
    );
  }

  return renderFallbackPetIcon(type, className);
};

export function renderPetIcon(
  type: string,
  sizeClass: string = 'h-6 w-6',
  name?: string
): React.ReactNode {
  return <PetIcon type={type} name={name} className={sizeClass} />;
}
