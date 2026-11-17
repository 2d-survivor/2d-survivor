import type { NativeWeaponConfig } from '../types';

/**
 * Zarabatana Tranquilizante — fixed weapon exclusive to the Domador de Feras.
 * It is handled directly by GameEngine and never enters the common weapon,
 * evolution or fusion pools.
 */
export const ZARABATANA: NativeWeaponConfig = {
  name: 'Zarabatana Tranquilizante',
  description:
    'Dispara dardos rápidos no inimigo mais próximo, aplicando lentidão. A fauna abatida dentro da Aura de Doma é domada em vez de morrer.',
  iconName: 'Crosshair',
};

export const ZARABATANA_STATS = {
  baseDamage: 12,
  baseCooldown: 1.1,
  damagePerHeroLevel: 0.1,
  range: 620,
  projectileSpeed: 760,
  projectileRadius: 5,
  projectileLife: 1.4,
  slowFactor: 0.15,
  slowDuration: 2,
} as const;
