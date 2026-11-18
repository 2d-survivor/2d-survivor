'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { Info, PawPrint, Shield, Swords, Zap } from 'lucide-react';
import { Player } from '@/game/entities/Player';
import { CHARACTERS } from '@/game/data/characters';
import { LULA_SKILL, WEAPON_REGISTRY } from '@/game/data/upgrades';
import { TAMEABLE_SPECIES } from '@/game/data/doma';
import {
  PET_DELIVERY_LABEL,
  PET_ROLE_LABEL,
  getPetAttackProfile,
  type PetDelivery,
  type PetRole,
} from '@/game/data/petAttacks';
import {
  describePetStatuses,
  formatPetSynergySentence,
  getPetGuide,
} from '@/game/data/petGuide';
import type { CharacterConfig } from '@/game/types';
import { CharacterAtlasPortrait } from './CharacterAtlasPortrait';
import { renderNamedIcon, renderWeaponIcon } from './GameIcons';

// Level-1 starter-weapon values mirrored from WeaponSystem.fireWeapon and each
// trigger. Damage is shown before the character's might bonus; cooldown is
// multiplied by the character's cooldown reduction below.
const HERO_WEAPON_LEVEL_ONE: Record<
  string,
  { damage: number[]; cooldown: number; cooldownFactor?: number; damageNote?: string }
> = {
  derson: { damage: [14, 18, 15], cooldown: 0.82, damageNote: 'pão / café / bolo' },
  dukarai: { damage: [18], cooldown: 1.28 },
  kayrurururu: { damage: [30], cooldown: 1.42, cooldownFactor: 0.7 },
  dr_janelinha: { damage: [13], cooldown: 0.9 },
  lula: { damage: [LULA_SKILL.damage], cooldown: LULA_SKILL.cooldown / 1000 },
  domador_feras: { damage: [12], cooldown: 1.1, damageNote: 'zarabatana' },
};

const DOMADOR = 'domador_feras';

const formatNumber = (value: number, digits = 1): string =>
  value.toLocaleString('pt-BR', { maximumFractionDigits: digits });

const formatSeconds = (value: number): string => `${formatNumber(value, 2)} s`;

function describeCharacterPassive(character: CharacterConfig): string {
  if (character.id === DOMADOR) {
    return 'Aura de Doma: doma automaticamente a fauna liberada que morre dentro do alcance da aura, desde que haja espaço na matilha.';
  }
  const bonuses = character.statBonuses;
  const parts: string[] = [];
  if (bonuses.maxHp) parts.push(`+${formatNumber(bonuses.maxHp)} HP máx`);
  if (bonuses.armor) parts.push(`+${formatNumber(bonuses.armor)} armadura`);
  if (bonuses.speed) parts.push(`${bonuses.speed > 0 ? '+' : ''}${formatNumber(bonuses.speed * 100)}% velocidade`);
  if (bonuses.might) parts.push(`+${formatNumber(bonuses.might * 100)}% dano`);
  if (bonuses.projectileSpeed) {
    parts.push(`+${formatNumber(bonuses.projectileSpeed * 100)}% vel. projétil`);
  }
  if (bonuses.cooldownReduction) {
    parts.push(`-${formatNumber(bonuses.cooldownReduction * 100)}% recarga`);
  }
  if (bonuses.recovery) parts.push(`+${formatNumber(bonuses.recovery)} HP/s regeneração`);
  if (bonuses.pickupRadius) parts.push(`+${formatNumber(bonuses.pickupRadius)} coleta`);
  if (bonuses.critChance) parts.push(`+${formatNumber(bonuses.critChance * 100)}% crítico`);
  if (bonuses.xpMultiplier) parts.push(`+${formatNumber(bonuses.xpMultiplier * 100)}% XP`);
  if (bonuses.attackSpeed) parts.push(`+${formatNumber(bonuses.attackSpeed * 100)}% vel. ataque`);
  if (bonuses.bonusAmount) parts.push(`+${formatNumber(bonuses.bonusAmount)} projétil`);
  if (bonuses.area) parts.push(`+${formatNumber(bonuses.area * 100)}% área`);
  if (bonuses.damageReduction) {
    parts.push(`+${formatNumber(bonuses.damageReduction * 100)}% redução de dano`);
  }
  if (character.id === 'lula') {
    parts.push('a cada nível: +0,8% dano, +0,8% cadência e +0,4% velocidade');
  }
  return parts.length > 0 ? parts.join(' · ') : 'Sem bônus passivos adicionais.';
}

const StatRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3 border-b border-[#2a2f3a] py-1 last:border-0">
    <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-[#9ca3af]">
      {label}
    </span>
    <span className="text-right text-[11px] font-semibold leading-relaxed text-[#f3f4f6]">
      {value}
    </span>
  </div>
);

const InfoBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="rounded-lg border border-[#383e4c] bg-gradient-to-b from-[#1c2027] to-[#121419] p-3">
    <h4 className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-[#e69f22]">
      {title}
    </h4>
    <div className="text-[11px] leading-relaxed text-[#cbd5e1]">{children}</div>
  </section>
);

/** Portrait-only card: the roster shows just the hero art until it is clicked. */
function HeroPortrait({ character }: { character: CharacterConfig }) {
  if (character.animationSprite) {
    return <CharacterAtlasPortrait character={character} />;
  }
  if (character.sprite) {
    return (
      <Image
        src={character.sprite}
        alt={character.name}
        fill
        unoptimized
        className="object-contain"
      />
    );
  }
  if (character.walkSprite) {
    const frames = Math.max(1, character.walkFrames ?? 1);
    return (
      <span
        role="img"
        aria-label={character.name}
        className="block h-full w-full bg-no-repeat"
        style={{
          backgroundImage: `url("${character.walkSprite}")`,
          backgroundSize: `${frames * 100}% 100%`,
          backgroundPosition: '0% 0%',
        }}
      />
    );
  }
  return renderNamedIcon(character.iconName, 'h-14 w-14', 'text-amber-200');
}

const HeroInfo: React.FC<{
  character: CharacterConfig;
  player: Player;
  weapon?: (typeof WEAPON_REGISTRY)[keyof typeof WEAPON_REGISTRY];
}> = ({ character, player, weapon }) => {
  const hasWeapon = Boolean((character.startingWeapon && weapon) || character.nativeWeapon);
  const profile = HERO_WEAPON_LEVEL_ONE[character.id] ?? {
    damage: [0],
    cooldown: 0,
    cooldownFactor: 1,
    damageNote: undefined,
  };
  const cooldown =
    profile.cooldown *
    Math.max(0.45, 1 - player.cooldownReduction) *
    (profile.cooldownFactor ?? 1);
  const damage = profile.damage.map((value) => formatNumber(value * player.might)).join(' / ');

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-lg border border-[#383e4c] bg-[#14171c] p-2.5 text-[11px] leading-relaxed text-[#9ca3af]">
        {character.description}
      </p>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-[#383e4c] bg-gradient-to-b from-[#1c2027] to-[#121419] p-3">
          <h4 className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-[#e69f22]">
            Atributos no nível 1
          </h4>
          <StatRow label="HP Máximo" value={formatNumber(player.maxHp)} />
          <StatRow label="Armadura" value={formatNumber(player.armor)} />
          <StatRow label="Velocidade" value={`${formatNumber(player.speed)} u/s`} />
          <StatRow
            label="Dano Base"
            value={
              hasWeapon
                ? `${damage}${profile.damageNote ? ` (${profile.damageNote})` : ''}`
                : '—'
            }
          />
          <StatRow
            label="Cooldown"
            value={hasWeapon ? `${formatSeconds(cooldown)} por ataque` : '—'}
          />
        </div>
        <div className="rounded-lg border border-[#383e4c] bg-gradient-to-b from-[#1c2027] to-[#121419] p-3">
          <h4 className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-[#e69f22]">
            Arma e passiva
          </h4>
          <StatRow
            label={character.nativeWeapon ? 'Arma Nativa' : 'Arma Inicial'}
            value={
              <span className="flex items-center justify-end gap-1">
                {character.startingWeapon && weapon ? (
                  <>
                    {renderWeaponIcon(character.startingWeapon, 'w-4 h-4')}
                    <span>{weapon.name}</span>
                  </>
                ) : character.nativeWeapon ? (
                  <>
                    {renderNamedIcon(character.nativeWeapon.iconName, 'w-4 h-4')}
                    <span>{character.nativeWeapon.name}</span>
                  </>
                ) : (
                  <>
                    {renderNamedIcon('PawPrint', 'w-4 h-4')}
                    <span>Aura de Doma</span>
                  </>
                )}
              </span>
            }
          />
          <StatRow label="Habilidade Passiva" value={describeCharacterPassive(character)} />
        </div>
      </div>
    </div>
  );
};

const BEAST_SPECIALS = [
  {
    icon: '🐺',
    name: 'Uivo Ancestral',
    cost: 40,
    unlock: 'Sempre disponível',
    effect:
      'Por 6 s, a matilha ganha +40% de velocidade de ataque e +25% de dano; cada golpe aplica Presa por 5 s.',
  },
  {
    icon: '🛡️',
    name: 'Muralha de Presas',
    cost: 65,
    unlock: '10 espécies domadas na run ou nível 15',
    effect:
      'As feras formam um anel (raio 150) e provocam a fauna num raio de 320 por 3 s. Por 5 s, pets recebem -30% de dano e o herói -20%, com empurrão inicial de 180.',
  },
  {
    icon: '🌿',
    name: 'Chamado dos Ancestrais',
    cost: 100,
    unlock: '17 espécies domadas na run ou nível 30',
    effect:
      'Por 10 s, a Aura de Doma triplica de raio e todo abate dentro dela doma automaticamente. Pets curam 100% e ganham +50% de dano.',
  },
] as const;

const BEAST_COMBOS = [
  {
    title: 'Presa',
    text: 'Alvos marcados recebem +25% de dano de toda a matilha. Ariranha e onça-pintada têm bônus extras contra eles.',
  },
  {
    title: 'Veneno + Lentidão',
    text: 'O veneno causa +50% de dano em alvos lentos. Formiga-bala, rã-dardo, lacraia, sucuri e aranha-golias são os venenos; borboleta, preguiça e aranha-golias aplicam lentidão.',
  },
  {
    title: 'Sangramento + Veneno',
    text: 'A cortadeira mantém o sangramento ativo enquanto o alvo estiver envenenado. Louva-a-deus causa o dobro de dano em alvos sangrando.',
  },
  {
    title: 'Atordoamento e Presa',
    text: 'Louva-a-deus causa +100% e filhote de jacaré +50% contra alvos atordoados ou presos. Cigarra, bicho-pau, anta, jacaré-açu e sucuri criam essa abertura.',
  },
  {
    title: 'Foco da matilha',
    text: 'A piranha ganha +10% de dano por companheiro já atacando o mesmo alvo, então brilha em matilhas rápidas e numerosas.',
  },
  {
    title: 'Couraça e provocação',
    text: 'A anta reduz em 20% o dano recebido pelos pets próximos; a capivara provoca a fauna comum e agrupa os inimigos para os ataques em área.',
  },
] as const;

const DomadorInfo: React.FC = () => (
  <div className="flex flex-col gap-3">
    <p className="rounded-lg border border-emerald-800/60 bg-emerald-950/20 p-2.5 text-[11px] leading-relaxed text-emerald-100/90">
      O Domador enxerga aliados na fauna da floresta. Ele não precisa matar para domar: basta derrubar o
      animal <strong>dentro da Aura de Doma</strong> com a espécie liberada e uma vaga livre na matilha.
    </p>

    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <InfoBlock title="Como funciona a doma">
        <ul className="list-disc space-y-1 pl-4">
          <li>
            A Aura de Doma tem raio <strong>280</strong> e chega a <strong>430</strong> com níveis de
            Doma Rápida.
          </li>
          <li>
            Animais liberados que morrem dentro da aura viram pets. A barra <strong>Doma</strong> no HUD
            liga e desliga cada espécie.
          </li>
          <li>
            A Zarabatana Tranquilizante enfraquece e desacelera a fauna, ajudando a derrubar o animal
            dentro da aura.
          </li>
          <li>Elites também podem ser domados e ocupam uma vaga como qualquer outro pet.</li>
        </ul>
      </InfoBlock>

      <InfoBlock title="Quantos bichos ele consegue domar">
        <p>
          A matilha começa com <strong>2 vagas</strong>. Cada nível de{' '}
          <strong>Chamado da Matilha</strong> adiciona <strong>+1 vaga</strong>, até o máximo de{' '}
          <strong>5 bichos</strong>.
        </p>
        <p className="mt-1.5 text-[#9ca3af]">
          Com a matilha cheia, novos abates não domam. Durante o Chamado dos Ancestrais, esses abates
          viram cura para os pets e +8 de Fúria.
        </p>
      </InfoBlock>
    </div>

    <InfoBlock title="Como desbloquear os especiais">
      <p>
        Os três especiais usam a <strong>Fúria da Matilha</strong> (0–100), que não decai. Ganhos:{' '}
        <strong>+1</strong> por abate comum, <strong>+2</strong> por abate de pet,{' '}
        <strong>+5</strong> por elite, <strong>+25</strong> por chefe e <strong>+8</strong> por criatura
        domada.
      </p>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {BEAST_SPECIALS.map((special) => (
          <div
            key={special.name}
            className="rounded-md border border-amber-800/60 bg-slate-950/60 p-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-black text-amber-100">
                <span aria-hidden="true">{special.icon}</span> {special.name}
              </span>
              <span className="shrink-0 rounded border border-amber-700/60 px-1 font-mono text-[9px] font-bold text-amber-300">
                {special.cost} Fúria
              </span>
            </div>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-300">
              {special.unlock}
            </p>
            <p className="mt-1 text-[10px] leading-snug text-[#cbd5e1]">{special.effect}</p>
          </div>
        ))}
      </div>
    </InfoBlock>

    <InfoBlock title="Combinações da matilha">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {BEAST_COMBOS.map((combo) => (
          <div key={combo.title} className="rounded-md border border-[#2a2f3a] bg-slate-950/40 p-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-amber-200">
              {combo.title}
            </p>
            <p className="mt-0.5 text-[10px] leading-snug text-[#cbd5e1]">{combo.text}</p>
          </div>
        ))}
      </div>
    </InfoBlock>

    <InfoBlock title={`Ataque e sinergia de cada bicho (${TAMEABLE_SPECIES.length} espécies)`}>
      <div className="grid max-h-80 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
        {TAMEABLE_SPECIES.map((species) => {
          const profile = getPetAttackProfile(species.type);
          const guide = getPetGuide(species.type);
          return (
            <article
              key={species.type}
              className="rounded-md border border-[#2a2f3a] bg-slate-950/50 p-2"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#f3f4f6]">
                  <PawPrint className="h-3 w-3 text-emerald-300" aria-hidden="true" />
                  {species.name}
                </span>
                <span className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
                  {PET_ROLE_LABEL[profile.role as PetRole]} ·{' '}
                  {PET_DELIVERY_LABEL[profile.delivery as PetDelivery]}
                </span>
              </div>
              <p className="mt-1 text-[10px] leading-snug text-[#cbd5e1]">
                {guide?.attack ?? 'Ataque ainda não catalogado.'}
              </p>
              <p className="mt-0.5 text-[9px] text-slate-400">
                Aplica: {describePetStatuses(species.type)}
              </p>
              <p className="mt-1 text-[9px] font-black leading-snug text-amber-300">
                {formatPetSynergySentence(species.type)}
              </p>
            </article>
          );
        })}
      </div>
    </InfoBlock>
  </div>
);

export const HeroStatusTab: React.FC = () => {
  const heroes = useMemo(
    () =>
      CHARACTERS.map((character) => ({
        character,
        player: new Player(character),
        weapon: character.startingWeapon ? WEAPON_REGISTRY[character.startingWeapon] : undefined,
      })),
    []
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const selected = heroes.find((hero) => hero.character.id === selectedId);

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="rounded-lg border border-[#383e4c] bg-[#14171c] p-2.5 text-[11px] leading-relaxed text-[#9ca3af]">
        <span className="font-bold text-[#f3f4f6]">Escolha um herói:</span> clique apenas na imagem para
        selecionar e depois abra a aba <span className="font-bold text-[#e69f22]">Informações</span> para
        ver todos os detalhes.
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {heroes.map(({ character }) => {
          const isSelected = character.id === selectedId;
          return (
            <div key={character.id} className="flex flex-col gap-1">
              <button
                type="button"
                aria-pressed={isSelected}
                aria-label={`Selecionar ${character.name}`}
                onClick={() => {
                  setSelectedId(character.id);
                  setInfoOpen(false);
                }}
                className={`group flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 p-1.5 transition active:scale-95 ${isSelected
                  ? 'border-[#f5a623] bg-gradient-to-b from-[#3b2a12] to-[#1e1812] shadow-[0_0_16px_rgba(245,166,35,0.28)]'
                  : 'border-[#383e4c] bg-gradient-to-b from-[#1c2027] to-[#121419] hover:border-[#6b7280]'
                  }`}
              >
                <span
                  className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border shadow-inner"
                  style={{
                    backgroundColor: character.color,
                    borderColor: isSelected ? '#f5a623' : character.portraitColor,
                  }}
                >
                  <HeroPortrait character={character} />
                </span>
                <span
                  className={`w-full truncate text-center text-[10px] font-bold ${isSelected ? 'text-[#ffd700]' : 'text-[#cbd5e1]'
                    }`}
                >
                  {character.name}
                </span>
              </button>
              {isSelected && (
                <button
                  type="button"
                  onClick={() => setInfoOpen((open) => !open)}
                  aria-expanded={infoOpen}
                  className={`flex cursor-pointer items-center justify-center gap-1 rounded-md border px-1 py-1 text-[9px] font-black uppercase tracking-wide transition active:scale-95 ${infoOpen
                    ? 'border-[#f5a623] bg-[#3b2a12] text-[#ffd700]'
                    : 'border-[#4b5363] bg-[#14171c] text-[#e3bf78] hover:border-[#f5a623]'
                    }`}
                >
                  <Info className="h-3 w-3" />
                  Informações
                </button>
              )}
            </div>
          );
        })}
      </div>

      {selected ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#e69f22]">
              {selected.character.name} — {selected.character.title}
            </span>
            <span className="text-[10px] text-[#6b7280]">
              {infoOpen ? 'Informações abertas abaixo.' : 'Abra a aba Informações no retrato selecionado.'}
            </span>
          </div>

          {infoOpen && (
            <div className="max-h-[32rem] overflow-y-auto pr-1">
              {selected.character.id === DOMADOR ? (
                <DomadorInfo />
              ) : (
                <HeroInfo
                  character={selected.character}
                  player={selected.player}
                  weapon={selected.weapon}
                />
              )}
            </div>
          )}
        </>
      ) : (
        <p className="rounded-lg border border-dashed border-[#383e4c] bg-[#121419] p-3 text-center text-[11px] text-[#6b7280]">
          Clique em um herói para liberar a aba de informações.
        </p>
      )}

      <div className="grid grid-cols-1 gap-2 text-[10px] text-[#6b7280] sm:grid-cols-3">
        <span className="flex items-center gap-1.5">
          <Swords className="h-3.5 w-3.5 text-[#e69f22]" /> Dano e recarga no nível 1, sem power-ups ou
          equipamentos.
        </span>
        <span className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-[#e69f22]" /> A recarga já inclui a redução do próprio
          herói.
        </span>
        <span className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-[#e69f22]" /> A linha amarela mostra com quais bichos a espécie
          combina.
        </span>
      </div>
    </div>
  );
};
