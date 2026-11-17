import type { PetUpgradeId } from '../types';

export interface PetUpgradeDefinition {
  id: PetUpgradeId;
  name: string;
  iconName: string;
  maxLevel: number;
  /** One line per level, index 0 = level 1. */
  levelDescriptions: string[];
}

const MATILHA_MAX_PETS = 5;
const BASE_MAX_PETS = 2;
const MATILHA_PETS_PER_LEVEL = 1;
const BASE_AURA_RADIUS = 280;
const AURA_RADIUS_PER_LEVEL = 30;

/**
 * Domador de Feras exclusive level-up cards. They replace the common weapon,
 * passive and fusion pools while the Beastmaster is the active hero.
 */
export const PET_UPGRADE_REGISTRY: Record<PetUpgradeId, PetUpgradeDefinition> = {
  chamado_matilha: {
    id: 'chamado_matilha',
    name: 'Chamado da Matilha',
    iconName: 'Users',
    maxLevel: 3,
    levelDescriptions: [1, 2, 3].map((level) => {
      const before = BASE_MAX_PETS + (level - 1) * MATILHA_PETS_PER_LEVEL;
      const after = Math.min(MATILHA_MAX_PETS, before + MATILHA_PETS_PER_LEVEL);
      return `Aumenta o limite de pets ativos de ${before} para ${after}.`;
    }),
  },
  furia_selvagem: {
    id: 'furia_selvagem',
    name: 'Fúria Selvagem',
    iconName: 'Flame',
    maxLevel: 5,
    levelDescriptions: [1, 2, 3, 4, 5].map(
      (level) =>
        `Pets domados causam +${level * 10}% de dano e atacam +${level * 8}% mais rápido.`
    ),
  },
  couraca_floresta: {
    id: 'couraca_floresta',
    name: 'Couraça da Floresta',
    iconName: 'Shield',
    maxLevel: 5,
    levelDescriptions: [1, 2, 3, 4, 5].map(
      (level) =>
        `Pets domados ganham +${level * 15}% de HP máximo e +${level} de armadura.`
    ),
  },
  elo_vital: {
    id: 'elo_vital',
    name: 'Elo Vital',
    iconName: 'HeartPulse',
    maxLevel: 5,
    levelDescriptions: [1, 2, 3, 4, 5].map(
      (level) =>
        `Pets regeneram ${level}% de HP/s e curam o Domador em 1 HP a cada 12 acertos críticos da matilha.`
    ),
  },
  doma_rapida: {
    id: 'doma_rapida',
    name: 'Doma Rápida',
    iconName: 'Radar',
    maxLevel: 5,
    levelDescriptions: [1, 2, 3, 4, 5].map(
      (level) =>
        `Amplia o alcance da Aura de Doma para ${
          BASE_AURA_RADIUS + level * AURA_RADIUS_PER_LEVEL
        }.`
    ),
  },
};

export const PET_UPGRADE_IDS: PetUpgradeId[] = [
  'chamado_matilha',
  'furia_selvagem',
  'couraca_floresta',
  'elo_vital',
  'doma_rapida',
];
