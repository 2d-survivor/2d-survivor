import { AmazonMissionMetric, DifficultyId, MissionObjectivesHUD, CompanionId } from '../types';
// Random Amazon Forest missions: seven options per phase, drawn before the run.
export const AMAZON_TURN_ENDS = [300, 900, 1200] as const;
export const AMAZON_TURN_LABELS: Record<1 | 2 | 3, string> = {
  1: 'Fase 1 · 00:00–05:00',
  2: 'Fase 2 · 05:00–15:00',
  3: 'Fase 3 · 15:00–20:00',
};

export interface AmazonMissionTemplate {
  id: string;
  title: string;
  metric: AmazonMissionMetric;
  target: number;
}

export const AMAZON_MISSION_BANK: Record<1 | 2 | 3, AmazonMissionTemplate[]> = {
  1: [
    { id: 'a1_fruits', title: 'Coletar frutas', metric: 'fruits', target: 5 },
    { id: 'a1_level', title: 'Alcançar nível', metric: 'level', target: 10 },
    {
      id: 'a1_water',
      title: 'Bichos na água/praia',
      metric: 'waterKills',
      target: 15,
    },
    { id: 'a1_gold', title: 'Juntar ouro', metric: 'gold', target: 300 },
    {
      id: 'a1_predators',
      title: 'Abater predadores',
      metric: 'evolvedPredators',
      target: 1,
    },
    {
      id: 'a1_fruits_big',
      title: 'Coleta reforçada',
      metric: 'fruits',
      target: 8,
    },
    { id: 'a1_gold_big', title: 'Ouro da mata', metric: 'gold', target: 500 },
  ],
  2: [
    { id: 'a2_fruits', title: 'Coletar frutas', metric: 'fruits', target: 10 },
    { id: 'a2_level', title: 'Alcançar nível', metric: 'level', target: 20 },
    {
      id: 'a2_water',
      title: 'Bichos na água/praia',
      metric: 'waterKills',
      target: 30,
    },
    {
      id: 'a2_predators',
      title: 'Abater predadores',
      metric: 'evolvedPredators',
      target: 3,
    },
    {
      id: 'a2_bosses',
      title: 'Derrotar chefes',
      metric: 'bosses',
      target: 5,
    },
    {
      id: 'a2_fruits_big',
      title: 'Fartura da floresta',
      metric: 'fruits',
      target: 15,
    },
    { id: 'a2_gold', title: 'Fortuna verde', metric: 'gold', target: 800 },
  ],
  3: [
    { id: 'a3_level', title: 'Alcançar nível', metric: 'level', target: 30 },
    {
      id: 'a3_water',
      title: 'Bichos na água/praia',
      metric: 'waterKills',
      target: 50,
    },
    {
      id: 'a3_predators',
      title: 'Abater predadores',
      metric: 'evolvedPredators',
      target: 5,
    },
    { id: 'a3_gold', title: 'Juntar ouro', metric: 'gold', target: 1500 },
    {
      id: 'a3_bosses',
      title: 'Derrotar chefes',
      metric: 'bosses',
      target: 8,
    },
    {
      id: 'a3_fruits',
      title: 'Colheita final',
      metric: 'fruits',
      target: 20,
    },
    {
      id: 'a3_water_big',
      title: 'Rio infestado',
      metric: 'waterKills',
      target: 75,
    },
  ],
};

export interface AmazonMissionBaseline {
  fruits: number;
  waterKills: number;
  evolvedPredators: number;
  bosses: number;
  gold: number;
}

export interface AmazonTurnState {
  turn: 1 | 2 | 3;
  endTime: number;
  missions: AmazonMissionTemplate[];
  baseline: AmazonMissionBaseline;
  accepted: boolean;
  delivered: boolean;
}


export const STAGE_COMPANIONS: Record<1 | 2 | 3, CompanionId> = { 1: 'frog', 2: 'turtle', 3: 'butterfly' };
export type ForestCounters = AmazonMissionBaseline & { level: number };
export function createForestStages(difficulty: DifficultyId): AmazonTurnState[] {
  const count = difficulty === 'hard' ? 2 : difficulty === 'nightmare' || difficulty === 'infernal' ? 3 : 1;
  return ([1, 2, 3] as const).map(turn => {
    const choices = [...AMAZON_MISSION_BANK[turn]];
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    return { turn, endTime: AMAZON_TURN_ENDS[turn - 1], missions: choices.slice(0, count),
      baseline: { fruits: 0, waterKills: 0, evolvedPredators: 0, bosses: 0, gold: 0 }, accepted: false, delivered: false };
  });
}
export function currentForestStage(stages: AmazonTurnState[], time: number): AmazonTurnState {
  return stages[time < 300 ? 0 : time < 900 ? 1 : 2];
}
export function forestStageView(stage: AmazonTurnState, counters: ForestCounters, time: number, unlocked: CompanionId[]): MissionObjectivesHUD {
  const reward = STAGE_COMPANIONS[stage.turn];
  const missions = stage.missions.map(mission => {
    const progress = !stage.accepted ? 0 : Math.min(mission.target, Math.max(0,
      mission.metric === 'level' ? counters.level : counters[mission.metric] - stage.baseline[mission.metric]));
    return { id: mission.id, title: mission.title, progress, target: mission.target,
      complete: progress >= mission.target, claimed: stage.delivered, claimable: false };
  });
  const status = stage.delivered ? 'delivered' : time >= stage.endTime ? 'expired' : !stage.accepted ? 'available'
    : missions.every(mission => mission.complete) ? 'ready' : 'accepted';
  return { turn: stage.turn, turnLabel: AMAZON_TURN_LABELS[stage.turn], endTime: stage.endTime,
    status, reward, rewardUnlocked: unlocked.includes(reward), missions };
}
