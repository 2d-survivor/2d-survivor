import type { PetUpgradeId } from '../types';

export interface PetUpgradeDefinition {
  id: PetUpgradeId;
  name: string;
  iconName: string;
  maxLevel: number;
  /** One line per level, index 0 = level 1. */
  levelDescriptions: string[];
}

const MATILHA_MAX_PETS = 8;
const BASE_MAX_PETS = 2;
const BASE_TAME_THRESHOLD = 40;
const BASE_AURA_RADIUS = 280;

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
      const before = BASE_MAX_PETS + (level - 1) * 2;
      const after = Math.min(MATILHA_MAX_PETS, before + 2);
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
        `Pets domados causam +${level * 20}% de dano e atacam +${level * 20}% mais rápido.`
    ),
  },
  couraca_floresta: {
    id: 'couraca_floresta',
    name: 'Couraça da Floresta',
    iconName: 'Shield',
    maxLevel: 5,
    levelDescriptions: [1, 2, 3, 4, 5].map(
      (level) =>
        `Pets domados ganham +${level * 25}% de HP máximo e +${level * 2} de armadura.`
    ),
  },
  elo_vital: {
    id: 'elo_vital',
    name: 'Elo Vital',
    iconName: 'HeartPulse',
    maxLevel: 5,
    levelDescriptions: [1, 2, 3, 4, 5].map(
      (level) =>
        `Pets regeneram ${level * 2}% de HP/s e curam o Domador em 1 HP a cada 10 acertos críticos da matilha.`
    ),
  },
  doma_rapida: {
    id: 'doma_rapida',
    name: 'Doma Rápida',
    iconName: 'Radar',
    maxLevel: 5,
    levelDescriptions: [1, 2, 3, 4, 5].map(
      (level) =>
        `Doma criaturas com até ${BASE_TAME_THRESHOLD + level * 5}% de HP e amplia o alcance da aura para ${BASE_AURA_RADIUS + level * 40}.`
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
