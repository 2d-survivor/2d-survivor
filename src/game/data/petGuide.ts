import type { EnemyType } from '../types';
import { getPetAttackProfile, PET_STATUS_LABEL } from './petAttacks';
import { TAMEABLE_SPECIES } from './doma';

/**
 * Human-readable guide for the Domador de Feras.
 *
 * `attack` explains what the tamed animal does in combat and `synergies` lists
 * the packmates that mechanically benefit from (or feed) its kit. The in-game
 * doma tooltip and the hero status tab both read from this single table.
 */
export interface PetGuideEntry {
  attack: string;
  synergies: EnemyType[];
}

export const PET_GUIDE: Partial<Record<EnemyType, PetGuideEntry>> = {
  // ---- Basic fauna -------------------------------------------------------
  bullet_ant: {
    attack:
      'Dispara uma rajada de 3 ferrões ácidos. Cada acúmulo de veneno corrói o alvo por 3,2 s.',
    synergies: ['blue_butterfly', 'sloth', 'leafcutter_ant'],
  },
  leafcutter_ant: {
    attack:
      'Mordida cortante que aplica sangramento. Enquanto o alvo estiver envenenado, o sangramento não expira.',
    synergies: ['bullet_ant', 'poison_dart_frog', 'praying_mantis'],
  },
  blue_butterfly: {
    attack:
      'Pulso de escamas que atinge até 3 inimigos, deixando-os lentos e vulneráveis (+10% de dano recebido).',
    synergies: ['bullet_ant', 'giant_centipede', 'rhino_beetle'],
  },
  cicada: {
    attack:
      'Canção em área que atordoa os inimigos e acelera a matilha (+15% de velocidade de ataque por 4 s).',
    synergies: ['praying_mantis', 'baby_black_caiman'],
  },

  // ---- Medium fauna ------------------------------------------------------
  poison_dart_frog: {
    attack:
      'Dardo venenoso de alto dano ao longo do tempo, com chance de atordoar o alvo.',
    synergies: ['blue_butterfly', 'sloth', 'praying_mantis'],
  },
  praying_mantis: {
    attack:
      'Golpe de lâmina que causa o dobro de dano em alvos atordoados ou sangrando.',
    synergies: ['cicada', 'leafcutter_ant'],
  },
  stick_bug: {
    attack:
      'Golpe pesado que prende o alvo no lugar por 1,2 s, abrindo espaço para a matilha.',
    synergies: ['praying_mantis', 'baby_black_caiman'],
  },
  toucan: {
    attack:
      'Bico perfurante que atravessa até 3 inimigos e marca o alvo (Presa) por 4 s.',
    synergies: ['giant_otter', 'elite_jaguar'],
  },

  // ---- Resistant fauna ---------------------------------------------------
  capybara: {
    attack:
      'Cabeçada que provoca a fauna comum para perto dela, agrupando os inimigos para os ataques em área.',
    synergies: ['giant_centipede', 'blue_butterfly'],
  },
  sloth: {
    attack:
      'Garras lentas que prendem e desaceleram o alvo, deixando-o exposto ao veneno.',
    synergies: ['bullet_ant', 'poison_dart_frog', 'praying_mantis'],
  },
  rhino_beetle: {
    attack:
      'Investida que empurra o alvo e o deixa vulnerável (+15% de dano recebido por 3 s).',
    synergies: ['piranha', 'elite_jaguar', 'bullet_ant'],
  },
  sawyer_beetle: {
    attack:
      'Serra rápida que acumula sangramento em até 4 camadas, corroendo alvos resistentes.',
    synergies: ['praying_mantis', 'leafcutter_ant'],
  },
  giant_centipede: {
    attack:
      'Nuvem de veneno em área que atinge até 3 inimigos e empilha até 4 camadas de veneno.',
    synergies: ['blue_butterfly', 'sloth', 'leafcutter_ant'],
  },

  // ---- River fauna -------------------------------------------------------
  piranha: {
    attack:
      'Mordidas rápidas. Ganha +10% de dano por cada companheiro já focado no mesmo alvo.',
    synergies: ['bat', 'cicada', 'giant_otter'],
  },
  pink_river_dolphin: {
    attack:
      'Sonar em área que marca e deixa vulneráveis até 4 inimigos de uma vez.',
    synergies: ['giant_otter', 'elite_jaguar', 'piranha'],
  },
  giant_otter: {
    attack:
      'Investida que causa +25% de dano contra alvos marcados pela matilha.',
    synergies: ['toucan', 'pink_river_dolphin', 'elite_jaguar'],
  },
  baby_black_caiman: {
    attack:
      'Bocada que causa +50% de dano contra alvos atordoados ou presos.',
    synergies: ['cicada', 'stick_bug', 'elite_tapir'],
  },
  bat: {
    attack:
      'Mordida drenante que cura a cada golpe: quanto mais rápido a matilha ataca, mais o herói se mantém vivo.',
    synergies: ['cicada', 'capybara'],
  },

  // ---- Forest elites -----------------------------------------------------
  elite_jaguar: {
    attack:
      'Bote que marca o alvo e causa +80% de dano contra alvos marcados e +80% contra alvos com pouca vida.',
    synergies: ['toucan', 'pink_river_dolphin'],
  },
  elite_tapir: {
    attack:
      'Investida atordoante que concede couraça aos pets próximos (-20% de dano recebido por 4 s).',
    synergies: ['capybara', 'praying_mantis'],
  },
  elite_goliath_spider: {
    attack:
      'Projétil que lentifica, marca e envenena o alvo por 6,5 s, preparando a matilha para o abate.',
    synergies: ['giant_otter', 'elite_jaguar', 'giant_centipede'],
  },
  elite_black_caiman: {
    attack:
      'Mordida que prende e sangra o alvo ao mesmo tempo, segurando ameaças grandes no lugar.',
    synergies: ['praying_mantis', 'baby_black_caiman'],
  },
  sucuri: {
    attack:
      'Constrição que prende e envenena o alvo simultaneamente, mantendo-o sob controle.',
    synergies: ['praying_mantis', 'baby_black_caiman', 'blue_butterfly'],
  },
};

const SPECIES_NAMES: Partial<Record<EnemyType, string>> = Object.fromEntries(
  TAMEABLE_SPECIES.map((species) => [species.type, species.name])
);

export function getSpeciesName(type: EnemyType): string {
  return SPECIES_NAMES[type] ?? type;
}

export function getPetGuide(type: EnemyType): PetGuideEntry | undefined {
  return PET_GUIDE[type];
}

/** "Sinergia: A, B e C." — the yellow line shown in the doma tooltip. */
export function formatPetSynergySentence(type: EnemyType): string {
  const names = (PET_GUIDE[type]?.synergies ?? []).map(getSpeciesName);
  if (names.length === 0) return 'Sinergia: nenhuma sinergia direta.';
  if (names.length === 1) return `Sinergia: ${names[0]}.`;
  return `Sinergia: ${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}.`;
}

/** Names of every status the species leaves behind (for the guide cards). */
export function describePetStatuses(type: EnemyType): string {
  const statuses = getPetAttackProfile(type).statuses;
  if (statuses.length === 0) return 'Sem efeito adicional.';
  const unique = Array.from(new Set(statuses.map((status) => PET_STATUS_LABEL[status.kind])));
  return unique.join(', ');
}
