'use client';

import { MissionObjectivesHUD } from '@/game/types';
import { COMPANIONS } from '@/game/data/companions';

const STATUS_TEXT = {
  available: 'Converse com o caçador para aceitar esta etapa.',
  accepted: 'Conclua todos os objetivos e entregue ao caçador antes do prazo.',
  ready: 'Volte ao caçador para entregar!',
  delivered: 'Etapa entregue! Companheiro disponível no menu principal para a próxima partida.',
  expired: 'O prazo desta etapa terminou. Tente novamente em outra partida.',
};

export function ForestStagePanel({ stage, onAccept, onDeliver }: {
  stage: MissionObjectivesHUD; onAccept?: () => void; onDeliver?: () => void;
}) {
  const companion = COMPANIONS[stage.reward];
  return <section className="space-y-2 rounded-lg border border-emerald-800/60 bg-slate-950/85 p-2 text-xs text-slate-200">
    <h3 className="font-bold text-emerald-300">Missões da floresta · {stage.turnLabel}</h3>
    <p className={stage.status === 'ready' ? 'font-bold text-amber-300' : 'text-slate-300'}>{STATUS_TEXT[stage.status]}</p>
    <ul className="space-y-1">{stage.missions.map(mission => <li key={mission.id} className="flex justify-between gap-2 rounded border border-slate-700 px-2 py-1">
      <span>{stage.status === 'delivered' ? '✓' : mission.complete ? '★' : '○'} {mission.title}</span>
      <span className="shrink-0 font-mono">{mission.progress}/{mission.target}</span>
    </li>)}</ul>
    <p>{companion.icon} <strong>{companion.name}</strong>{stage.rewardUnlocked ? ' · Já desbloqueado' : ' · Desbloqueio permanente'}</p>
    {(onAccept || onDeliver) && <p className="text-slate-400">{companion.description} Não altera os companheiros equipados nesta partida.</p>}
    {stage.status === 'available' && onAccept && <button type="button" onClick={onAccept} className="w-full rounded-lg bg-emerald-800 px-3 py-2 font-bold hover:bg-emerald-700">Aceitar etapa {stage.turn}</button>}
    {stage.status === 'ready' && onDeliver && <button type="button" onClick={onDeliver} className="w-full rounded-lg bg-amber-700 px-3 py-2 font-bold hover:bg-amber-600">Entregar etapa {stage.turn}</button>}
  </section>;
}
