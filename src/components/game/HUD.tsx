'use client';

import React from 'react';
import { ForestStagePanel } from './ForestStagePanel';
import { COMPANIONS } from '@/game/data/companions';
import { HUDState, SpecialAbilityHUD } from '@/game/types';
import { HUNTER_FISH_TARGET } from '@/game/data/hunterQuest';
import { renderWeaponIcon, renderPassiveIcon } from './GameIcons';
import {
  Skull,
  Coins,
  Clock,
  Heart,
  Zap,
  Volume2,
  VolumeX,
  Pause,
  Fish,
  Bird,
  Bug,
  PawPrint,
  Shield,
  Swords,
} from 'lucide-react';

const PET_BIRD_TYPES = new Set(['toucan', 'blue_butterfly', 'cicada', 'bat']);
const PET_BUG_TYPES = new Set([
  'bullet_ant',
  'leafcutter_ant',
  'giant_centipede',
  'rhino_beetle',
  'sawyer_beetle',
  'praying_mantis',
  'stick_bug',
]);

/** Pet bar icon: birds and insects keep their silhouette, the rest use a paw. */
function renderPetIcon(type: string, sizeClass: string = 'h-6 w-6'): React.ReactNode {
  if (PET_BIRD_TYPES.has(type)) return <Bird className={`${sizeClass} text-lime-300`} />;
  if (PET_BUG_TYPES.has(type)) return <Bug className={`${sizeClass} text-amber-300`} />;
  return <PawPrint className={`${sizeClass} text-emerald-300`} />;
}

interface HUDProps {
  hud: HUDState;
  onPause: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  difficultyName: string;

  onReleasePet: (index: number) => void;
  onTogglePetStance: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  hud,
  onPause,
  isMuted,
  onToggleMute,
  difficultyName,
  onReleasePet,
  onTogglePetStance,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const hpPercent = Math.min(100, Math.max(0, (hud.playerHp / Math.max(1, hud.playerMaxHp)) * 100));
  const staminaPercent = Math.min(100, Math.max(0, (hud.stamina / Math.max(1, hud.maxStamina)) * 100));
  const objectives = hud.objectives;
  const specialSlots: SpecialAbilityHUD[] = hud.specialAbilities ?? [
    { key: '1', cooldown: 0, cooldownMax: 0, unlocked: false },
    { key: '2', cooldown: 0, cooldownMax: 0, unlocked: false },
    { key: '3', cooldown: 0, cooldownMax: 0, unlocked: false },
  ];
  const petStance = hud.petStance ?? 'aggressive';
  const isAggressiveStance = petStance === 'aggressive';

  return (
    <div className="pointer-events-none absolute inset-0 select-none flex flex-col justify-between p-3 font-sans text-white">
      {hud.hunterQuest?.accepted && !hud.hunterQuest.completed && (
        <div role="status" className="absolute bottom-28 left-1/2 w-60 max-w-[72vw] -translate-x-1/2 rounded-xl border border-amber-600 bg-stone-950/95 px-4 py-3 text-amber-100 shadow-lg sm:bottom-24">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-bold"><Fish className="h-5 w-5 text-cyan-300" /> Peixes</span>
            <span className="font-mono text-xl font-black tabular-nums">{hud.hunterQuest.fish}/{HUNTER_FISH_TARGET}</span>
          </div>
          <div role="progressbar" aria-label="Peixes coletados para a tribo" aria-valuemin={0}
            aria-valuemax={HUNTER_FISH_TARGET} aria-valuenow={hud.hunterQuest.fish}
            className="mt-2 h-2 overflow-hidden rounded-full bg-stone-800">
            <div className="h-full rounded-full bg-cyan-400 transition-[width] duration-200 motion-reduce:transition-none"
              style={{ width: `${Math.min(100, hud.hunterQuest.fish / HUNTER_FISH_TARGET * 100)}%` }} />
          </div>
          <p className="mt-2 text-center text-xs">{hud.hunterQuest.fish >= HUNTER_FISH_TARGET
            ? 'Volte ao caçador para entregar' : 'Comida para a tribo'}</p>
        </div>
      )}
      {/* Timer anchored at the top of the viewport */}
      <div aria-label="Tempo de sobrevivência" className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 border-2 border-slate-700 rounded-xl px-4 py-1.5 flex items-center gap-2 shadow-2xl backdrop-blur-md">
        <Clock className="w-5 h-5 text-amber-400" />
        <span className="font-mono text-xl sm:text-2xl font-black tracking-widest text-white">
          {formatTime(hud.survivalTime)}
        </span>
      </div>

      {/* Difficulty Badge */}
      <div className="pointer-events-none absolute right-3 top-3 select-none">
        <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-200 shadow-md backdrop-blur-sm">
          <Skull className="h-3 w-3 text-red-400" />
          {difficultyName}
        </div>
      </div>

      {/* Top Section */}
      <div className="flex flex-col gap-2 pt-24">
        {/* Boss Health Bar (if active) */}
        {hud.activeBoss && (
          <div className="w-full max-w-lg mx-auto bg-slate-950/90 border-2 border-red-700 rounded-xl p-2 shadow-2xl backdrop-blur-md">
            <div className="flex justify-between items-center mb-1 text-xs font-bold text-red-400 uppercase tracking-widest">
              <span>👑 {hud.activeBoss.name}</span>
              <span>{Math.max(0, Math.round((hud.activeBoss.hp / hud.activeBoss.maxHp) * 100))}%</span>
            </div>
            <div className="w-full bg-red-950/80 rounded-full h-3.5 overflow-hidden border border-red-900">
              <div
                className="bg-gradient-to-r from-red-600 to-rose-500 h-full rounded-full transition-all duration-150"
                style={{ width: `${Math.max(0, (hud.activeBoss.hp / hud.activeBoss.maxHp) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Event Banner Alert */}
        {hud.eventAlert && (
          <div className="w-full flex justify-center">
            <div className="bg-red-950/90 border-2 border-red-500 text-red-200 px-4 py-1.5 rounded-full font-black text-sm tracking-wide shadow-2xl animate-bounce backdrop-blur-sm">
              {hud.eventAlert}
            </div>
          </div>
        )}

        {/* Middle Stats Bar: HP, Kills, Gold, Audio/Pause Controls */}
        <div className="flex justify-between items-start sm:items-center gap-2">
          {/* Left: Mission Objectives, HP & Inventory */}
          <div className="flex flex-col gap-1.5 max-w-[46%] sm:max-w-none">
            {/* Amazon Forest Mission Objectives (compact, current turn only) */}
            {objectives && <div className="w-56 max-w-full"><ForestStagePanel stage={objectives} /></div>}
            {!!hud.companions?.length && <div className="w-56 max-w-full rounded-lg border border-cyan-900 bg-slate-950/85 p-2 text-[10px] text-cyan-100">
              <p className="font-bold">Companheiros ativos</p>
              <p>{hud.companions.map(id => COMPANIONS[id].icon + ' ' + COMPANIONS[id].name).join(' · ')}</p>
              {hud.companions.includes('turtle') && <p>Escudo: {hud.companionShield ?? 0} PV</p>}
            </div>}

            {/* Amazon Forest restricted inventory: 4 attack + 4 buff squares */}
            <div className="w-56 max-w-full rounded-lg border border-slate-700/80 bg-slate-950/85 px-2 py-1.5 shadow-lg backdrop-blur-sm">
              <div className="mb-1 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest">
                <span className="text-amber-300">Ataques</span>
                <span className="text-slate-500">{Math.min(4, hud.weapons.length)}/4</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {Array.from({ length: 4 }).map((_, index) => {
                  const weapon = hud.weapons[index];
                  return weapon ? (
                    <div
                      key={weapon.id}
                      title={`${weapon.name} (Nv.${weapon.level})`}
                      className={`relative flex h-8 items-center justify-center rounded border bg-slate-900/85 ${weapon.evolved ? 'border-amber-400 shadow shadow-amber-500/30' : 'border-amber-700/60'
                        }`}
                    >
                      {renderWeaponIcon(weapon.id, 'h-4 w-4')}
                      <span className="absolute -bottom-1.5 -right-1 rounded border border-slate-700 bg-slate-950 px-0.5 text-[8px] font-black text-yellow-300">
                        Nv.{weapon.level}
                      </span>
                    </div>
                  ) : (
                    <div
                      key={`empty-weapon-${index}`}
                      className="h-8 rounded border border-dashed border-slate-700/80 bg-slate-900/40"
                    />
                  );
                })}
              </div>
              <div className="mb-1 mt-1.5 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest">
                <span className="text-emerald-300">Buffs</span>
                <span className="text-slate-500">{Math.min(4, hud.passives.length)}/4</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {Array.from({ length: 4 }).map((_, index) => {
                  const passive = hud.passives[index];
                  return passive ? (
                    <div
                      key={passive.id}
                      title={`${passive.name} (Nv.${passive.level})`}
                      className="relative flex h-8 items-center justify-center rounded border border-emerald-700/60 bg-slate-900/85"
                    >
                      {renderPassiveIcon(passive.id, 'h-4 w-4')}
                      <span className="absolute -bottom-1.5 -right-1 rounded border border-slate-700 bg-slate-950 px-0.5 text-[8px] font-black text-emerald-300">
                        Nv.{passive.level}
                      </span>
                    </div>
                  ) : (
                    <div
                      key={`empty-passive-${index}`}
                      className="h-8 rounded border border-dashed border-slate-700/80 bg-slate-900/40"
                    />
                  );
                })}
              </div>
            </div>

            {/* HP Bar */}
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700/80 rounded-lg px-2.5 py-1 backdrop-blur-sm shadow">
              <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse shrink-0" />
              <div className="w-24 sm:w-36 bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
                <div
                  className={`h-full transition-all duration-150 ${hpPercent > 50 ? 'bg-emerald-500' : hpPercent > 25 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
              <span className="text-xs font-bold font-mono text-slate-200 min-w-14 text-right">
                {hud.playerHp}/{hud.playerMaxHp}
              </span>
            </div>

            {/* Stamina Bar */}
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700/80 rounded-lg px-2.5 py-1 backdrop-blur-sm shadow">
              <Zap className={`w-4 h-4 shrink-0 ${staminaPercent > 15 ? 'text-cyan-400' : 'text-red-500'}`} />
              <div className="w-24 sm:w-36 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                <div
                  className={`h-full transition-all duration-150 ${staminaPercent > 40 ? 'bg-cyan-400' : staminaPercent > 15 ? 'bg-amber-400' : 'bg-red-500'
                    }`}
                  style={{ width: `${staminaPercent}%` }}
                />
              </div>
              <span className="text-xs font-bold font-mono text-slate-200 min-w-14 text-right">
                {hud.stamina}/{hud.maxStamina}
              </span>
            </div>

          </div>

          {/* Right: Kills, Gold, and Controls */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1 text-right">
              <div className="flex items-center justify-end gap-1.5 bg-slate-900/80 border border-slate-700/80 rounded-lg px-2.5 py-0.5 backdrop-blur-sm">
                <Skull className="w-4 h-4 text-red-400" />
                <span className="font-mono font-bold text-sm text-slate-100">{hud.kills}</span>
              </div>
              <div className="flex items-center justify-end gap-1.5 bg-slate-900/80 border border-slate-700/80 rounded-lg px-2.5 py-0.5 backdrop-blur-sm">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="font-mono font-bold text-sm text-yellow-300">{hud.gold}</span>
              </div>
            </div>

            {/* Buttons (Pause & Sound) */}
            <div className="flex gap-1.5 pointer-events-auto">
              <button
                onClick={onToggleMute}
                className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer active:scale-95"
                title={isMuted ? 'Desmutar Áudio' : 'Mutar Áudio'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                onClick={onPause}
                className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer active:scale-95"
                title="Pausar Jogo (ESC)"
              >
                <Pause className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar: three special ability slots */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-center gap-2">
          {specialSlots.map((slot, index) => {
            const cooldownMax = Math.max(1, slot.cooldownMax);
            const cooldown = Math.max(0, slot.cooldown);
            const ready = slot.unlocked && cooldown <= 0;
            const progress = slot.unlocked ? Math.max(0, Math.min(1, 1 - cooldown / cooldownMax)) : 0;

            return (
              <div
                key={slot.key || index + 1}
                title={slot.unlocked
                  ? `${slot.name ?? 'Especial'}${slot.description ? ` — ${slot.description}` : ''}`
                  : 'Slot bloqueado'}
                className={`relative flex h-14 w-16 flex-col items-center justify-center rounded-lg border-2 bg-slate-950/85 shadow-lg backdrop-blur-sm ${slot.unlocked
                    ? slot.active
                      ? 'border-emerald-400 shadow-emerald-500/40'
                      : ready
                        ? 'border-amber-400 shadow-amber-500/30'
                        : 'border-slate-600'
                    : 'border-slate-800 opacity-60'
                  }`}
              >
                <span className="absolute -left-1 -top-2 flex h-4 w-4 items-center justify-center rounded border border-slate-600 bg-slate-950 font-mono text-[9px] font-black text-slate-200">
                  {slot.key || index + 1}
                </span>
                {slot.unlocked ? (
                  <>
                    <span className="text-lg leading-none">
                      {slot.key === '1'
                        ? slot.active ? '💨' : '☕'
                        : slot.key === '2'
                          ? '🧀'
                          : slot.active ? '🌀' : '🏍️'}
                    </span>
                    <span className="mt-0.5 max-w-[60px] truncate px-1 text-[8px] font-bold uppercase tracking-wide text-amber-200">
                      {slot.name ?? 'Especial'}
                    </span>
                    <span className={`text-[9px] font-black ${ready ? 'text-emerald-300' : 'text-slate-300'}`}>
                      {ready ? 'PRONTO' : `${Math.ceil(cooldown)}s`}
                    </span>
                    <span className="absolute inset-x-1 bottom-0.5 h-0.5 overflow-hidden rounded bg-slate-800">
                      <span
                        className="block h-full rounded bg-amber-400 transition-[width] duration-150 motion-reduce:transition-none"
                        style={{ width: `${progress * 100}%` }}
                      />
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-base leading-none">🔒</span>
                    <span className="text-[8px] font-bold uppercase tracking-wide text-slate-500">
                      Bloqueado
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Pet bar: Domador de Feras companions (Alt + Right Click releases) */}
        {hud.pets && hud.pets.length > 0 && (
          <div
            className={`absolute left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1 ${hud.hunterQuest?.accepted && !hud.hunterQuest.completed ? 'bottom-[11.5rem]' : 'bottom-11'
              }`}
          >
            <div className="pointer-events-auto flex items-end gap-2 rounded-xl border border-amber-700/60 bg-slate-950/85 px-2.5 py-2 shadow-2xl backdrop-blur-md">
              {hud.pets.map((pet, index) => {
                const petHpPercent = Math.max(0, Math.min(100, (pet.hp / Math.max(1, pet.maxHp)) * 100));
                const evolutionProgress =
                  pet.evolved || hud.level < 10 ? null : Math.min(100, (pet.age / 60) * 100);
                const releaseLabel = `${pet.name} — ${pet.hp}/${pet.maxHp} HP${pet.evolved ? ' • Evoluído' : ''
                  }\nAlt + Clique Direito para libertar`;
                return (
                  <button
                    key={`${pet.type}-${index}`}
                    type="button"
                    title={releaseLabel}
                    aria-label={`${pet.name}: ${pet.hp} de ${pet.maxHp} HP. Alt mais clique direito para libertar.`}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      if (event.altKey) onReleasePet(index);
                    }}
                    className={`relative flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border bg-gradient-to-b from-slate-900 to-slate-950 px-1 py-1 transition active:scale-95 ${pet.evolved
                        ? 'border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.55)]'
                        : 'border-amber-700/70 hover:border-amber-500'
                      }`}
                  >
                    {renderPetIcon(pet.type, 'h-6 w-6')}
                    <span className="w-full truncate text-center text-[8px] font-bold uppercase tracking-wide text-slate-300">
                      {pet.name}
                    </span>
                    <div
                      role="progressbar"
                      aria-label={`Vida de ${pet.name}`}
                      aria-valuemin={0}
                      aria-valuemax={pet.maxHp}
                      aria-valuenow={pet.hp}
                      className="h-1.5 w-full overflow-hidden rounded-full border border-slate-700 bg-slate-800"
                    >
                      <div
                        className={`h-full rounded-full transition-[width] duration-150 motion-reduce:transition-none ${petHpPercent > 50
                            ? 'bg-emerald-500'
                            : petHpPercent > 25
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                        style={{ width: `${petHpPercent}%` }}
                      />
                    </div>
                    {evolutionProgress !== null && (
                      <div
                        title={`Evolução: ${Math.floor(pet.age)}s/60s`}
                        className="h-0.5 w-full overflow-hidden rounded-full bg-slate-800"
                      >
                        <div
                          className="h-full rounded-full bg-amber-300 transition-[width] duration-200 motion-reduce:transition-none"
                          style={{ width: `${evolutionProgress}%` }}
                        />
                      </div>
                    )}
                    {pet.evolved && (
                      <span className="absolute -right-1 -top-1 rounded-full border border-emerald-300 bg-emerald-950 px-1 text-[8px] font-black text-emerald-200">
                        EVO
                      </span>
                    )}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={onTogglePetStance}
                title={`Postura: ${isAggressiveStance ? 'Agressivo' : 'Guarda'} (R para alternar)\nAgressivo: caça inimigos em toda a tela.\nGuarda: forma um círculo defensivo e prioriza quem se aproxima.`}
                aria-label={`Alternar postura da matilha. Atual: ${isAggressiveStance ? 'Agressivo' : 'Guarda'}`}
                className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border bg-gradient-to-b from-slate-900 to-slate-950 px-1 py-1 text-center transition active:scale-95 ${isAggressiveStance
                    ? 'border-orange-500/80 text-orange-300 hover:border-orange-300'
                    : 'border-sky-500/80 text-sky-300 hover:border-sky-300'
                  }`}
              >
                {isAggressiveStance ? <Swords className="h-6 w-6" /> : <Shield className="h-6 w-6" />}
                <span className="text-[8px] font-black uppercase tracking-wide">
                  {isAggressiveStance ? 'Agressivo' : 'Guarda'}
                </span>
                <span className="text-[7px] font-bold text-slate-400">R</span>
              </button>
            </div>
            <span className="pointer-events-none rounded-full bg-slate-950/80 px-2 py-0.5 text-[9px] font-semibold text-amber-200/90">
              Alt + Clique Direito para libertar • R alterna a postura
            </span>
          </div>
        )}

        {/* Bottom Hint for mobile/desktop */}
        <div className="flex justify-between items-end text-[10px] text-slate-400/80">
          <span className="hidden sm:inline">
            WASD ou Setas para mover • SHIFT para dash • ESPAÇO para pular • 1, 2 e 3 para especiais • ESC para pausar
          </span>
          <span className="sm:hidden">Arraste para mover (Joystick Virtual)</span>
        </div>
      </div>
    </div>
  );
};
