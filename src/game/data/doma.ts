import { EnemyType } from '../types';

/**
 * Every common forest creature the Domador de Feras can tame. Bosses, elites
 * and illusory clones are never listed here. The player unlocks species in the
 * HUD's doma bar; only unlocked species can be marked by the Aura de Doma and
 * captured by the Zarabatana Tranquilizante.
 */
export interface TameableSpecies {
  type: EnemyType;
  name: string;
}

export const TAMEABLE_SPECIES: TameableSpecies[] = [
  // Basic fauna.
  { type: 'bullet_ant', name: 'Formiga-bala' },
  { type: 'leafcutter_ant', name: 'Formiga-cortadeira' },
  { type: 'blue_butterfly', name: 'Borboleta-azul' },
  { type: 'cicada', name: 'Cigarra' },
  // Medium threats.
  { type: 'poison_dart_frog', name: 'Rã-dardo' },
  { type: 'praying_mantis', name: 'Louva-a-deus' },
  { type: 'stick_bug', name: 'Bicho-pau' },
  { type: 'toucan', name: 'Tucano' },
  // Resistant fauna.
  { type: 'capybara', name: 'Capivara' },
  { type: 'sloth', name: 'Bicho-preguiça' },
  { type: 'rhino_beetle', name: 'Besouro-rino' },
  { type: 'sawyer_beetle', name: 'Besouro-serra' },
  { type: 'giant_centipede', name: 'Lacraia' },
  // River fauna.
  { type: 'piranha', name: 'Piranha' },
  { type: 'pink_river_dolphin', name: 'Boto' },
  { type: 'giant_otter', name: 'Ariranha' },
  // Special spawns.
  { type: 'baby_black_caiman', name: 'Filhote de jacaré' },
  { type: 'bat', name: 'Morcego' },
];
