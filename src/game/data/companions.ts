import { CharacterInventory, CompanionId } from '../types';

export const COMPANIONS: Record<CompanionId, { name: string; icon: string; description: string; stage: number }> = {
  frog: { name: 'Sapo curandeiro', icon: '🐸', description: 'Cura 2% da vida máxima a cada 5 segundos.', stage: 1 },
  turtle: { name: 'Tartaruga guardiã', icon: '🐢', description: 'Escudo de 20% da vida máxima, renovado a cada 20 segundos. Não acumula.', stage: 2 },
  butterfly: { name: 'Borboleta da mata', icon: '🦋', description: '+15% de velocidade de movimento.', stage: 3 },
};
export const COMPANION_IDS = Object.keys(COMPANIONS) as CompanionId[];

export function normalizeCompanions(unlocked: unknown, equipped: unknown): {
  unlockedCompanions: CompanionId[]; equippedCompanions: CompanionId[];
} {
  const valid = (value: unknown): value is CompanionId => typeof value === 'string' && Object.hasOwn(COMPANIONS, value);
  const owned = Array.isArray(unlocked) ? [...new Set(unlocked.filter(valid))] : [];
  const active = Array.isArray(equipped) ? [...new Set(equipped.filter(valid))].filter(id => owned.includes(id)).slice(0, 3) : [];
  return { unlockedCompanions: owned, equippedCompanions: active };
}

export function unlockCompanion(inventory: CharacterInventory, id: CompanionId): CharacterInventory {
  const normalized = normalizeCompanions(inventory.unlockedCompanions, inventory.equippedCompanions);
  if (normalized.unlockedCompanions.includes(id)) return inventory;
  return { ...inventory, ...normalized, unlockedCompanions: [...normalized.unlockedCompanions, id] };
}
