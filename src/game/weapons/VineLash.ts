import type { WeaponInstance } from '../types';

const VINE_SWEEP_DURATION = 0.24 / (1.3 * 1.3);
export const VINE_TIMING = {
  preparation: 0.07,
  snap: 0.07 + VINE_SWEEP_DURATION,
  retract: 0.12 + VINE_SWEEP_DURATION,
  end: 0.24 + VINE_SWEEP_DURATION,
} as const;
const SEGMENTS = 24;

export type VineLashVariant = 'clockwise' | 'counterclockwise';

export interface VinePoint { x: number; y: number }
export interface VineLashAttack {
  weapon: WeaponInstance;
  x: number;
  y: number;
  angle: number;
  variant: VineLashVariant;
  elapsed: number;
  reach: number;
  area: number;
  damage: number;
  slowDuration: number;
  hitEnemyIds: Set<number>;
}

/** The same polyline drives the visible vine and its swept collision. */
export function vinePoints(attack: VineLashAttack, time: number, x = attack.x, y = attack.y): VinePoint[] {
  const extension = Math.max(0, Math.min(1, (time - VINE_TIMING.preparation) / (VINE_TIMING.snap - VINE_TIMING.preparation)));
  const retraction = Math.max(0, Math.min(1, (time - VINE_TIMING.retract) / 0.12));
  // Uncoil before the damaging sweep so the full arc has the same reach.
  const preparation = Math.max(0, Math.min(1, time / VINE_TIMING.preparation));
  const fraction = preparation * preparation * (3 - 2 * preparation) * (1 - retraction) ** 2;
  const length = attack.reach * (0.06 + 0.94 * fraction);
  const direction = attack.variant === 'counterclockwise' ? -1 : 1;
  const angle = attack.angle + direction * (-0.5 + extension - retraction) * Math.PI;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return Array.from({ length: SEGMENTS + 1 }, (_, i) => {
    const t = i / SEGMENTS;
    const forward = t * length;
    const curl = direction * (Math.sin(t * Math.PI * 2) * 10 * attack.area + Math.sin(t * Math.PI) * length * 0.08) * (1 - fraction);
    return { x: x + forward * cos - curl * sin, y: y + forward * sin + curl * cos };
  });
}

function segmentDistanceSquared(p: VinePoint, a: VinePoint, b: VinePoint): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length)) : 0;
  return (p.x - a.x - dx * t) ** 2 + (p.y - a.y - dy * t) ** 2;
}

function insideTriangle(p: VinePoint, a: VinePoint, b: VinePoint, c: VinePoint): boolean {
  const cross = (u: VinePoint, v: VinePoint, w: VinePoint) => (v.x - u.x) * (w.y - u.y) - (v.y - u.y) * (w.x - u.x);
  if (Math.abs(cross(a, b, c)) < 1e-8) return false;
  const d1 = cross(a, b, p), d2 = cross(b, c, p), d3 = cross(c, a, p);
  return (d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0);
}

/** Checks the ribbon swept between two poses; tip segments win over body segments. */
export function vineHitMultiplier(previous: VinePoint[], current: VinePoint[], enemy: VinePoint, radius: number, reach: number): number {
  let multiplier = 0;
  const radiusSq = radius * radius;
  for (let i = 0; i < SEGMENTS; i++) {
    const a = previous[i], b = previous[i + 1], c = current[i + 1], d = current[i];
    if (insideTriangle(enemy, a, b, c) || insideTriangle(enemy, a, c, d) ||
      segmentDistanceSquared(enemy, a, b) <= radiusSq || segmentDistanceSquared(enemy, b, c) <= radiusSq ||
      segmentDistanceSquared(enemy, c, d) <= radiusSq || segmentDistanceSquared(enemy, d, a) <= radiusSq) {
      // A partly uncoiled tip near the player's hand is not the long-range sweet spot.
      const outerReach = Math.max(Math.hypot(enemy.x - previous[0].x, enemy.y - previous[0].y),
        Math.hypot(enemy.x - current[0].x, enemy.y - current[0].y)) + radius >= reach * 0.75;
      multiplier = Math.max(multiplier, i >= SEGMENTS * 0.75 && outerReach ? 1.5 : 1);
    }
  }
  return multiplier;
}
