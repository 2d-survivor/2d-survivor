'use client';

import React from 'react';
import { Play, Volume2, VolumeX, Home, Swords, Shield, Clock, Skull, AlertTriangle } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onQuitToMenu: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  sfxVolume: number;
  bgmVolume: number;
  onSfxVolumeChange: (val: number) => void;
  onBgmVolumeChange: (val: number) => void;
  /** Current run build, shown so the player can plan the next levels. */
  build?: {
    time: number;
    level: number;
    kills: number;
    weapons: { id: string; name: string; level: number; evolved: boolean }[];
    passives: { id: string; name: string; level: number }[];
  };
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onQuitToMenu,
  isMuted,
  onToggleMute,
  sfxVolume,
  bgmVolume,
  onSfxVolumeChange,
  onBgmVolumeChange,
  build,
}) => {
  const [confirmAbandon, setConfirmAbandon] = React.useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md my-auto bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-slate-700 rounded-2xl shadow-2xl p-6 flex flex-col items-center">
        <h2 className="text-2xl font-black uppercase tracking-widest text-white mb-4">
          JOGO PAUSADO
        </h2>

        {/* Current build */}
        {build && (
          <div className="w-full mb-4 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
            <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>Build atual</span>
              <span className="flex items-center gap-2 text-slate-300">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(build.time)}</span>
                <span className="flex items-center gap-1"><Skull className="h-3 w-3" />{build.kills}</span>
                <span className="text-amber-300">Nv.{build.level}</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {build.weapons.length === 0 && (
                <span className="text-[10px] text-slate-500">Nenhuma arma ainda.</span>
              )}
              {build.weapons.map((weapon) => (
                <span
                  key={weapon.id}
                  title={weapon.name}
                  className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                    weapon.evolved
                      ? 'border-amber-500 bg-amber-950/70 text-amber-200'
                      : 'border-slate-700 bg-slate-900 text-slate-200'
                  }`}
                >
                  <Swords className="h-3 w-3" />
                  {weapon.name.length > 16 ? `${weapon.name.slice(0, 15)}…` : weapon.name}
                  <span className="font-mono text-[9px] text-slate-400">Nv.{weapon.level}</span>
                </span>
              ))}
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {build.passives.map((passive) => (
                <span
                  key={passive.id}
                  title={passive.name}
                  className="inline-flex items-center gap-1 rounded border border-emerald-800 bg-emerald-950/60 px-1.5 py-0.5 text-[10px] font-bold text-emerald-200"
                >
                  <Shield className="h-3 w-3" />
                  {passive.name.length > 16 ? `${passive.name.slice(0, 15)}…` : passive.name}
                  <span className="font-mono text-[9px] text-emerald-400/80">Nv.{passive.level}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Audio Controls */}
        <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3.5 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Som Global</span>
            <button
              onClick={onToggleMute}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Efeitos Sonoros (SFX)</span>
              <span>{Math.round(sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sfxVolume}
              onChange={(e) => onSfxVolumeChange(parseFloat(e.target.value))}
              className="accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Música (BGM)</span>
              <span>{Math.round(bgmVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={bgmVolume}
              onChange={(e) => onBgmVolumeChange(parseFloat(e.target.value))}
              className="accent-amber-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          <button
            onClick={onResume}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm tracking-wider uppercase shadow-lg shadow-amber-500/20 transition cursor-pointer active:scale-95 flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            Continuar
          </button>

          {confirmAbandon ? (
            <div className="w-full rounded-xl border border-red-700 bg-red-950/60 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-red-200">
                <AlertTriangle className="h-4 w-4" />
                Abandonar a run? O progresso desta partida não será mantido.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setConfirmAbandon(false);
                    onQuitToMenu();
                  }}
                  className="flex-1 rounded-lg bg-red-700 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-white transition hover:bg-red-600 cursor-pointer active:scale-95"
                >
                  Sim, abandonar
                </button>
                <button
                  onClick={() => setConfirmAbandon(false)}
                  className="flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-slate-200 transition hover:bg-slate-800 cursor-pointer active:scale-95"
                >
                  Voltar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmAbandon(true)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-red-950/60 border border-slate-700 hover:border-red-700 text-slate-300 hover:text-red-200 font-bold text-xs tracking-wider uppercase transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Abandonar run
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
