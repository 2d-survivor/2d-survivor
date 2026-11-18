import type { EnemyType } from '../types';

/**
 * Domador de Feras combat matrix.
 *
 * Instead of one hand-written behaviour per species, every tamed animal is
 * described by three axes:
 *  - delivery: how the blow lands (melee, projectile, charge, pulse);
 *  - status:   what it leaves behind (poison, bleed, slow, pin, mark...);
 *  - role:     what the animal is for in the pack (blade, contaminator,
 *              tank, scout, support).
 *
 * The engine dispatches on `delivery` and applies the `statuses` list, so 23
 * species are built from ~10 mechanics combined in different ways.
 */
export type PetDelivery = 'melee' | 'projectile' | 'charge' | 'pulse';
export type PetRole = 'blade' | 'contaminator' | 'tank' | 'scout' | 'support';

export type PetStatusKind =
  | 'poison'
  | 'bleed'
  | 'slow'
  | 'pin'
  | 'stun'
  | 'mark'
  | 'vulnerable'
  | 'haste'
  | 'shield'
  | 'drain'
  | 'taunt';

export interface PetStatusEffect {
  kind: PetStatusKind;
  /** Proc chance (1 = always). */
  chance?: number;
  /** Duration in seconds. */
  duration?: number;
  /**
   * Strength, interpreted per kind:
   * poison/bleed -> fraction of the pet's damage per second
   * slow -> movement reduction (0.25 = 25%)
   * vulnerable -> extra damage taken (0.1 = +10%)
   * haste -> attack speed bonus for the pack
   * shield -> damage reduction for nearby pets
   * drain -> HP healed to the hero per hit
   * taunt -> how far the taunt reaches
   */
  power?: number;
  /** Poison only: how many times the same species may stack its venom. */
  maxStacks?: number;
}

export interface PetAttackProfile {
  delivery: PetDelivery;
  role: PetRole;
  /** Base seconds between attacks, before pack haste. */
  cooldown: number;
  /** Multiplier over the species' base bite damage (10 for common fauna). */
  damageMultiplier: number;
  /** Preferred range in world units. Melee/charge use it only as flavour. */
  range: number;
  color: string;
  statuses: PetStatusEffect[];
  /** Projectiles fired per volley. */
  volley?: number;
  /** Extra enemies a projectile may pass through. */
  pierce?: number;
  /** Pulse radius around the primary target. */
  splash?: number;
  /** How many enemies a pulse may hit. */
  maxTargets?: number;
  /** Knockback force applied on hit. */
  knockback?: number;
  /** Conditional damage bonuses. */
  bonusVsMarked?: number;
  bonusVsLowHp?: number;
  bonusVsStunned?: number;
  bonusVsBleeding?: number;
  /** Extra multiplier per packmate already attacking the same target. */
  bonusPerAllyFocus?: number;
}

export const PET_ROLE_LABEL: Record<PetRole, string> = {
  blade: 'Lâmina',
  contaminator: 'Contaminador',
  tank: 'Tanque',
  scout: 'Batedor',
  support: 'Suporte',
};

export const PET_DELIVERY_LABEL: Record<PetDelivery, string> = {
  melee: 'Corpo a corpo',
  projectile: 'Projétil',
  charge: 'Investida',
  pulse: 'Pulso',
};

export const PET_STATUS_LABEL: Record<PetStatusKind, string> = {
  poison: 'Veneno',
  bleed: 'Sangramento',
  slow: 'Lentidão',
  pin: 'Prender',
  stun: 'Atordoamento',
  mark: 'Presa',
  vulnerable: 'Vulnerabilidade',
  haste: 'Fúria da matilha',
  shield: 'Couraça da matilha',
  drain: 'Dreno',
  taunt: 'Provocação',
};

const PROFILE_FALLBACK: PetAttackProfile = {
  delivery: 'melee',
  role: 'blade',
  cooldown: 0.85,
  damageMultiplier: 0.9,
  range: 60,
  color: '#4ade80',
  statuses: [],
};

/**
 * One row per tameable species. Trade-off rule: control-driven animals deal
 * less damage, pure blades deal more and elites sit on top of the curve.
 */
export const PET_ATTACK_PROFILES: Partial<Record<EnemyType, PetAttackProfile>> = {
  // ---- Basic fauna -------------------------------------------------------
  bullet_ant: {
    delivery: 'projectile',
    role: 'contaminator',
    cooldown: 1.25,
    damageMultiplier: 0.5,
    range: 300,
    color: '#84cc16',
    volley: 3,
    statuses: [{ kind: 'poison', power: 0.22, duration: 3.2, maxStacks: 5 }],
  },
  leafcutter_ant: {
    delivery: 'melee',
    role: 'contaminator',
    cooldown: 1,
    damageMultiplier: 0.8,
    range: 60,
    color: '#a3e635',
    knockback: 70,
    statuses: [{ kind: 'bleed', power: 0.28, duration: 3.5 }],
  },
  blue_butterfly: {
    delivery: 'pulse',
    role: 'scout',
    cooldown: 1.6,
    damageMultiplier: 0.45,
    range: 220,
    color: '#60a5fa',
    splash: 90,
    maxTargets: 3,
    statuses: [
      { kind: 'slow', power: 0.25, duration: 3 },
      { kind: 'vulnerable', power: 0.1, duration: 3 },
    ],
  },
  cicada: {
    delivery: 'pulse',
    role: 'support',
    cooldown: 2.2,
    damageMultiplier: 0.35,
    range: 260,
    color: '#38bdf8',
    splash: 170,
    maxTargets: 4,
    statuses: [
      { kind: 'haste', power: 0.15, duration: 4 },
      { kind: 'stun', duration: 0.4 },
    ],
  },

  // ---- Medium fauna ------------------------------------------------------
  poison_dart_frog: {
    delivery: 'projectile',
    role: 'contaminator',
    cooldown: 1.5,
    damageMultiplier: 0.75,
    range: 320,
    color: '#84cc16',
    statuses: [
      { kind: 'poison', power: 0.5, duration: 4, maxStacks: 3 },
      { kind: 'stun', chance: 0.15, duration: 0.5 },
    ],
  },
  praying_mantis: {
    delivery: 'melee',
    role: 'blade',
    cooldown: 1.1,
    damageMultiplier: 0.78,
    range: 60,
    color: '#4ade80',
    knockback: 80,
    bonusVsStunned: 2,
    bonusVsBleeding: 2,
    statuses: [{ kind: 'bleed', chance: 0.35, power: 0.18, duration: 2.5 }],
  },
  stick_bug: {
    delivery: 'melee',
    role: 'tank',
    cooldown: 1.8,
    damageMultiplier: 0.45,
    range: 60,
    color: '#a3a3a3',
    knockback: 60,
    statuses: [{ kind: 'pin', duration: 1.2 }],
  },
  toucan: {
    delivery: 'projectile',
    role: 'scout',
    cooldown: 1.4,
    damageMultiplier: 0.72,
    range: 330,
    color: '#fbbf24',
    pierce: 2,
    statuses: [{ kind: 'mark', duration: 4 }],
  },

  // ---- Resistant fauna ---------------------------------------------------
  capybara: {
    delivery: 'melee',
    role: 'tank',
    cooldown: 1.5,
    damageMultiplier: 0.8,
    range: 60,
    color: '#f59e0b',
    knockback: 220,
    statuses: [{ kind: 'taunt', duration: 3, power: 160 }],
  },
  sloth: {
    delivery: 'melee',
    role: 'tank',
    cooldown: 2,
    damageMultiplier: 0.6,
    range: 60,
    color: '#94a3b8',
    statuses: [
      { kind: 'slow', power: 0.4, duration: 2 },
      { kind: 'pin', duration: 0.8 },
    ],
  },
  rhino_beetle: {
    delivery: 'charge',
    role: 'blade',
    cooldown: 1.6,
    damageMultiplier: 1.2,
    range: 60,
    color: '#f97316',
    knockback: 320,
    statuses: [{ kind: 'vulnerable', power: 0.15, duration: 3 }],
  },
  sawyer_beetle: {
    delivery: 'melee',
    role: 'contaminator',
    cooldown: 0.9,
    damageMultiplier: 0.62,
    range: 60,
    color: '#fb923c',
    knockback: 50,
    statuses: [{ kind: 'bleed', power: 0.2, duration: 3.5, maxStacks: 4 }],
  },
  giant_centipede: {
    delivery: 'pulse',
    role: 'contaminator',
    cooldown: 1.4,
    damageMultiplier: 0.4,
    range: 170,
    color: '#84cc16',
    splash: 130,
    maxTargets: 3,
    statuses: [{ kind: 'poison', power: 0.3, duration: 3.5, maxStacks: 4 }],
  },

  // ---- River fauna -------------------------------------------------------
  piranha: {
    delivery: 'melee',
    role: 'blade',
    cooldown: 0.7,
    damageMultiplier: 0.62,
    range: 60,
    color: '#f87171',
    knockback: 40,
    bonusPerAllyFocus: 0.1,
    statuses: [{ kind: 'bleed', chance: 0.4, power: 0.15, duration: 2.5 }],
  },
  pink_river_dolphin: {
    delivery: 'pulse',
    role: 'scout',
    cooldown: 2,
    damageMultiplier: 0.42,
    range: 300,
    color: '#f9a8d4',
    splash: 150,
    maxTargets: 4,
    statuses: [
      { kind: 'mark', duration: 4 },
      { kind: 'vulnerable', power: 0.1, duration: 3 },
    ],
  },
  giant_otter: {
    delivery: 'charge',
    role: 'blade',
    cooldown: 1.15,
    damageMultiplier: 0.95,
    range: 60,
    color: '#fb923c',
    knockback: 180,
    bonusVsMarked: 1.25,
    statuses: [],
  },
  baby_black_caiman: {
    delivery: 'melee',
    role: 'blade',
    cooldown: 1.3,
    damageMultiplier: 0.85,
    range: 70,
    color: '#4ade80',
    knockback: 150,
    bonusVsStunned: 1.5,
    statuses: [],
  },
  bat: {
    delivery: 'melee',
    role: 'support',
    cooldown: 0.9,
    damageMultiplier: 0.45,
    range: 60,
    color: '#c084fc',
    statuses: [{ kind: 'drain', power: 1.5 }],
  },

  // ---- Forest elites -----------------------------------------------------
  elite_jaguar: {
    delivery: 'charge',
    role: 'blade',
    cooldown: 1.5,
    damageMultiplier: 1,
    range: 60,
    color: '#fb923c',
    knockback: 240,
    bonusVsMarked: 1.8,
    bonusVsLowHp: 1.8,
    statuses: [{ kind: 'mark', duration: 5 }],
  },
  elite_tapir: {
    delivery: 'charge',
    role: 'tank',
    cooldown: 1.9,
    damageMultiplier: 0.95,
    range: 60,
    color: '#f59e0b',
    knockback: 260,
    statuses: [
      { kind: 'stun', duration: 0.6 },
      { kind: 'shield', power: 0.2, duration: 4 },
    ],
  },
  elite_goliath_spider: {
    delivery: 'projectile',
    role: 'contaminator',
    cooldown: 1.6,
    damageMultiplier: 0.85,
    range: 320,
    color: '#a3e635',
    statuses: [
      { kind: 'slow', power: 0.35, duration: 2.5 },
      { kind: 'mark', duration: 3 },
      { kind: 'poison', power: 0.45, duration: 6.5, maxStacks: 3 },
    ],
  },
  elite_black_caiman: {
    delivery: 'melee',
    role: 'tank',
    cooldown: 1.7,
    damageMultiplier: 1.05,
    range: 70,
    color: '#22c55e',
    knockback: 200,
    statuses: [
      { kind: 'pin', duration: 1.5 },
      { kind: 'bleed', power: 0.3, duration: 4 },
    ],
  },
  sucuri: {
    delivery: 'melee',
    role: 'tank',
    cooldown: 1.5,
    damageMultiplier: 0.6,
    range: 70,
    color: '#15803d',
    knockback: 60,
    statuses: [
      { kind: 'pin', duration: 1.4 },
      { kind: 'poison', power: 0.35, duration: 4 },
    ],
  },
};

/** Profile for any species, with a safe melee default for future fauna. */
export function getPetAttackProfile(type: string): PetAttackProfile {
  return PET_ATTACK_PROFILES[type as EnemyType] ?? PROFILE_FALLBACK;
}
