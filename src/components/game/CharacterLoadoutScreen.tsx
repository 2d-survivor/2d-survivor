'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, Crown, Footprints, Hand, Shield, Swords } from 'lucide-react';
import { CharacterConfig, EquipmentItem, EquipmentSlot, EquipmentStats, SavedGameData } from '@/game/types';
import { emptyInventory, equipInventoryItem, equipmentArtwork, EQUIPMENT_SLOTS, formatEquipmentStat, getEquipmentBonuses } from '@/game/data/inventory';
import { saveGameData } from '@/game/data/persistence';
import { CharacterAtlasPortrait } from './CharacterAtlasPortrait';
import { CompanionSelector } from './CompanionSelector';
import { renderNamedIcon } from './GameIcons';
import './CharacterLoadoutScreen.css';

const styles = {
  "screen": "hero-loadout-screen",
  "header": "hero-loadout-header",
  "eyebrow": "hero-loadout-eyebrow",
  "columns": "hero-loadout-columns",
  "heroName": "hero-loadout-heroName",
  "subtitle": "hero-loadout-subtitle",
  "muted": "hero-loadout-muted",
  "paperdoll": "hero-loadout-paperdoll",
  "portrait": "hero-loadout-portrait",
  "portraitImage": "hero-loadout-portraitImage",
  "slot": "hero-loadout-slot",
  "empty": "hero-loadout-empty",
  "slotIcon": "hero-loadout-slotIcon",
  "occupied": "hero-loadout-occupied",
  "itemImage": "hero-loadout-itemImage",
  "action": "hero-loadout-action",
  "bonuses": "hero-loadout-bonuses",
  "itemStats": "hero-loadout-itemStats",
  "rightColumn": "hero-loadout-rightColumn",
  "inventoryHeading": "hero-loadout-inventoryHeading",
  "itemList": "hero-loadout-itemList",
  "itemRow": "hero-loadout-itemRow",
  "itemThumbnail": "hero-loadout-itemThumbnail",
  "itemDescription": "hero-loadout-itemDescription",
  "itemActions": "hero-loadout-itemActions",
  "remove": "hero-loadout-remove",
  "selectedItem": "hero-loadout-selectedItem",
  "emptyInventory": "hero-loadout-emptyInventory",
  "future": "hero-loadout-future",
  "footer": "hero-loadout-footer"
} as const;

const SLOTS: EquipmentSlot[] = ['helmet', 'armor', 'weapon', 'gloves', 'boots'];
const SLOT_ICONS = { helmet: Crown, armor: Shield, weapon: Swords, gloves: Hand, boots: Footprints };

function ItemVisual({ item, slot }: { item?: EquipmentItem; slot: EquipmentSlot }) {
  const [failed, setFailed] = useState(false);
  const artwork = item && equipmentArtwork(item.id);
  const Icon = SLOT_ICONS[slot];
  return artwork && !failed
    ? <Image src={artwork} alt={item.name} width={72} height={88} unoptimized className={styles.itemImage} onError={() => setFailed(true)} />
    : <Icon aria-hidden="true" className={styles.slotIcon} />;
}

function ItemStats({ stats }: { stats: EquipmentStats }) {
  const keys = (Object.keys(stats) as (keyof EquipmentStats)[]).filter(key => stats[key]);
  return keys.length ? <ul className={styles.itemStats}>{keys.map(key => <li key={key}>{formatEquipmentStat(key, stats[key] ?? 0)}</li>)}</ul>
    : <p className={styles.muted}>Sem bônus de atributos.</p>;
}

export function CharacterLoadoutScreen({ character, savedData, onUpdateSave, onBack }: {
  character: CharacterConfig; savedData: SavedGameData; onUpdateSave: (save: SavedGameData) => void; onBack: () => void;
}) {
  const [filter, setFilter] = useState<EquipmentSlot | null>(null);
  const backButton = useRef<HTMLButtonElement>(null);
  const inventory = savedData.inventories?.[character.id] ?? emptyInventory();
  const bonuses = getEquipmentBonuses(inventory);
  const items = inventory.items.filter(item => !filter || item.slot === filter);
  const selectedItem = filter ? inventory.items.find(item => item.id === inventory.equipped[filter] && item.slot === filter) : undefined;

  useEffect(() => {
    backButton.current?.focus({ preventScroll: true });
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onBack(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  const changeEquipment = (slot: EquipmentSlot, itemId?: string) => {
    const nextInventory = equipInventoryItem(inventory, slot, itemId);
    if (nextInventory === inventory) return;
    const next = { ...savedData, inventories: { ...savedData.inventories, [character.id]: nextInventory } };
    saveGameData(next); onUpdateSave(next);
  };

  return <section className={styles.screen} aria-label={`Ficha de equipamentos de ${character.name}`}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>Personagens / {character.name}</p><h2>Equipamentos</h2></div>
      <button ref={backButton} type="button" onClick={onBack} className={styles.action}><ArrowLeft size={16} aria-hidden="true" /> Voltar aos personagens</button>
    </header>
    <div className={styles.columns}>
      <div>
        <h3 className={styles.heroName}>{character.name}</h3>
        <p className={styles.subtitle}>{character.title}</p>
        <div className={styles.paperdoll}>
          <div className={styles.portrait}>
            <div className={styles.portraitImage}>
              {character.animationSprite ? <CharacterAtlasPortrait character={character} />
                : character.sprite ? <Image src={character.sprite} alt={character.name} fill unoptimized className="object-contain" />
                  : renderNamedIcon(character.iconName, 'h-24 w-24', 'text-amber-200')}
            </div>
          </div>
          {SLOTS.map((slot, index) => {
            const item = inventory.items.find(owned => owned.id === inventory.equipped[slot] && owned.slot === slot);
            return <button key={slot} type="button" aria-pressed={filter === slot}
              aria-label={`${EQUIPMENT_SLOTS[slot]}: ${item?.name ?? 'Espaço vazio'}. Filtrar itens.`}
              onClick={() => setFilter(slot)}
              style={{ gridColumn: index < 3 ? 1 : 3, gridRow: index < 3 ? index + 1 : index - 2 }}
              className={`${styles.slot} ${item ? styles.occupied : styles.empty}`}>
              <ItemVisual key={item?.id ?? slot} item={item} slot={slot} />
              <span>{EQUIPMENT_SLOTS[slot]}</span><small>{item ? item.name : 'Vazio'}</small>
            </button>;
          })}
        </div>
        <section className={styles.bonuses} aria-label="Bônus dos equipamentos" aria-live="polite">
          <h3>Bônus dos equipamentos</h3>
          {Object.values(bonuses).some(value => value > 0) ? <ItemStats stats={bonuses} /> : <p className={styles.muted}>Nenhum bônus ativo. Equipe um item para fortalecer seu herói.</p>}
        </section>
      </div>
      <div className={styles.rightColumn}>
        <section aria-label="Itens disponíveis">
          <div className={styles.inventoryHeading}><h3>Itens disponíveis <span className={styles.muted}>({items.length})</span></h3>
            <select aria-label="Filtrar itens por categoria" value={filter ?? 'all'}
              onChange={event => setFilter(event.target.value === 'all' ? null : event.target.value as EquipmentSlot)}
              className={styles.action}>
              <option value="all">Todos os itens</option>
              {SLOTS.map(slot => <option key={slot} value={slot}>{EQUIPMENT_SLOTS[slot]}</option>)}
            </select>
          </div>
          <p className={styles.muted}>{filter ? `Categoria: ${EQUIPMENT_SLOTS[filter]}` : `Inventário de ${character.name}`}</p>
          {selectedItem && <div className={styles.selectedItem}>
            <span>{EQUIPMENT_SLOTS[selectedItem.slot]} equipado: <strong>{selectedItem.name}</strong></span>
            <button type="button" onClick={() => changeEquipment(selectedItem.slot)} className={styles.action}>Desequipar</button>
          </div>}
          {items.length ? <ul className={styles.itemList}>{items.map(item => {
            const equipped = inventory.equipped[item.slot] === item.id;
            return <li key={item.id} className={styles.itemRow}>
              <div className={styles.itemThumbnail}><ItemVisual key={item.id} item={item} slot={item.slot} /></div>
              <div className={styles.itemDescription}><h4>{item.name}</h4><p className={styles.muted}>{EQUIPMENT_SLOTS[item.slot]}</p><ItemStats stats={item.stats} /></div>
              <div className={styles.itemActions}><button type="button" disabled={equipped} onClick={() => changeEquipment(item.slot, item.id)}
                aria-label={equipped ? `${item.name} equipado` : `Equipar ${item.name}`} className={styles.action}>{equipped ? 'Equipado' : 'Equipar'}</button>
                {equipped && <button type="button" aria-label={`Desequipar ${item.name}`} onClick={() => changeEquipment(item.slot)} className={styles.remove}>Desequipar</button>}
              </div>
            </li>;
          })}</ul> : <p className={styles.emptyInventory}>{filter ? `Nenhum item de ${EQUIPMENT_SLOTS[filter].toLocaleLowerCase('pt-BR')} disponível.` : 'Inventário vazio. Conclua desafios para obter equipamentos.'}</p>}
        </section>
        <CompanionSelector compact character={character} savedData={savedData} onUpdateSave={onUpdateSave} />
        <div className={styles.future}><span>Novas categorias</span><button type="button" disabled className={styles.action}>Em breve</button></div>
      </div>
    </div>
    <footer className={styles.footer}>Alterações salvas automaticamente · Itens e companheiros serão usados na próxima partida.</footer>
  </section>;
}
