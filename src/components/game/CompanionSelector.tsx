'use client';

import { CharacterConfig, CompanionId, SavedGameData } from '@/game/types';
import { COMPANIONS, COMPANION_IDS, normalizeCompanions } from '@/game/data/companions';
import { emptyInventory } from '@/game/data/inventory';
import { saveGameData } from '@/game/data/persistence';

export function CompanionSelector({ character, savedData, onUpdateSave, compact = false }: {
  character: CharacterConfig; savedData: SavedGameData; onUpdateSave: (save: SavedGameData) => void; compact?: boolean;
}) {
  const inventory = savedData.inventories[character.id] ?? emptyInventory();
  const { unlockedCompanions, equippedCompanions } = normalizeCompanions(inventory.unlockedCompanions, inventory.equippedCompanions);
  const toggle = (id: CompanionId) => {
    if (!unlockedCompanions.includes(id)) return;
    const equipped = equippedCompanions.includes(id) ? equippedCompanions.filter(active => active !== id) : [...equippedCompanions, id].slice(0, 3);
    const next = { ...savedData, inventories: { ...savedData.inventories, [character.id]: { ...inventory, unlockedCompanions, equippedCompanions: equipped } } };
    saveGameData(next); onUpdateSave(next);
  };
  if (compact) return <section aria-label={`Companheiros de ${character.name}`} className="text-xs text-[#e8dfc9]">
    <h3 className="mb-3 font-serif text-lg text-[#dfb86c]">Companheiros <span className="text-xs text-[#bac6af]" aria-live="polite">{equippedCompanions.length}/3</span></h3>
    <div className="grid grid-cols-3 gap-2">{COMPANION_IDS.map(id => {
      const meta = COMPANIONS[id], unlocked = unlockedCompanions.includes(id), equipped = equippedCompanions.includes(id);
      return <button key={id} type="button" disabled={!unlocked} aria-pressed={equipped} onClick={() => toggle(id)}
        aria-label={`${meta.name}: ${!unlocked ? `bloqueado, etapa ${meta.stage}` : equipped ? 'equipado, clique para retirar' : 'clique para equipar'}`}
        className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-md border px-1 py-2 text-[11px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 disabled:cursor-not-allowed ${equipped ? 'border-[#90b784] bg-[#24351f]' : 'border-[#48503b] bg-[#171e13]'} ${unlocked ? 'cursor-pointer' : 'text-[#9ca78e]'}`}>
        <span className={`text-xl ${unlocked ? '' : 'grayscale opacity-50'}`} aria-hidden="true">{meta.icon}</span>
        <span>{id === 'frog' ? 'Sapo' : id === 'turtle' ? 'Tartaruga' : 'Borboleta'}</span>
        <span className="text-[10px]">{!unlocked ? 'Bloqueado' : equipped ? 'Equipado' : 'Disponível'}</span>
      </button>;
    })}</div>
    <details className="mt-2 text-[#b8c1ae]">
      <summary className="cursor-pointer py-1 focus-visible:outline-2 focus-visible:outline-amber-200">Habilidades e desbloqueios</summary>
      <ul className="mt-2 space-y-2">{COMPANION_IDS.map(id => <li key={id}><strong className="font-medium text-[#ead9b4]">{COMPANIONS[id].name}</strong> · {COMPANIONS[id].description} Desbloqueie entregando a etapa {COMPANIONS[id].stage} ao caçador.</li>)}</ul>
    </details>
  </section>;
  return <section aria-label={`Companheiros de ${character.name}`} className="stone-panel mt-3 p-3">
    <h3 className="text-sm font-bold text-amber-200">Companheiros de {character.name} · {equippedCompanions.length}/3</h3>
    <p className="my-2 text-xs text-slate-400">Escolha quem vai acompanhar você na próxima partida. Conquiste cada companheiro entregando as missões ao caçador na floresta.</p>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{COMPANION_IDS.map(id => {
      const meta = COMPANIONS[id], unlocked = unlockedCompanions.includes(id), equipped = equippedCompanions.includes(id);
      return <button key={id} type="button" disabled={!unlocked} aria-pressed={equipped} onClick={() => toggle(id)}
        className={`rounded-lg border p-3 text-left text-xs disabled:cursor-not-allowed ${equipped ? 'border-emerald-400 bg-emerald-950/50' : 'border-slate-600 bg-slate-950/50'}`}>
        <span className={`text-2xl ${unlocked ? '' : 'grayscale opacity-50'}`} aria-hidden="true">{meta.icon}</span>
        <span className="mt-1 block font-bold text-amber-100">{meta.name}</span>
        <span className="my-1 block text-slate-300">{meta.description}</span>
        <span className={equipped ? 'text-emerald-300' : 'text-slate-400'}>{!unlocked ? `Bloqueado · Etapa ${meta.stage}` : equipped ? 'Equipado · Clique para retirar' : 'Clique para equipar'}</span>
      </button>;
    })}</div>
  </section>;
}
