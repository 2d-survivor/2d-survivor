// Run with: node --test tests/forest-companions.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Load the framework-free TypeScript without adding a test-runner dependency.
const cache = new Map();
const loadExternal = createRequire(import.meta.url);
const storage = new Map();
const context = vm.createContext({ console, performance, window: {}, requestAnimationFrame: () => 1,
  localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } });
function load(file) {
  const filename = path.resolve(file);
  if (filename.endsWith('.css')) return {};
  if (filename.endsWith('.json')) return JSON.parse(fs.readFileSync(filename, 'utf8'));
  if (cache.has(filename)) return cache.get(filename).exports;
  const loadedModule = { exports: {} };
  cache.set(filename, loadedModule);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const resolve = specifier => {
    if (specifier === 'next/image') return { __esModule: true, default: props => React.createElement('img', { src: props.src, alt: props.alt, width: props.width, height: props.height }) };
    if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return loadExternal(specifier);
    const target = specifier.startsWith('@/') ? path.resolve('src', specifier.slice(2)) : path.resolve(path.dirname(filename), specifier);
    return load(fs.existsSync(target) && fs.statSync(target).isFile() ? target : fs.existsSync(`${target}.ts`) ? `${target}.ts` : fs.existsSync(`${target}.tsx`) ? `${target}.tsx` : path.join(target, 'index.ts'));
  };
  vm.runInContext(`(function(exports, require, module) { ${code}\n})`, context, { filename })(loadedModule.exports, resolve, loadedModule);
  return loadedModule.exports;
}
const { createForestStages, currentForestStage, forestStageView } = load('src/game/data/forestMissions.ts');
const { normalizeCompanions, unlockCompanion } = load('src/game/data/companions.ts');
const { emptyInventory, normalizeInventories, equipInventoryItem, getEquipmentBonuses, FOREST_ARMOR, GUARDIAN_BOW } = load('src/game/data/inventory.ts');
const { getInitialSave, loadSavedData, saveGameData } = load('src/game/data/persistence.ts');
const { Player } = load('src/game/entities/Player.ts');
const { WeaponSystem } = load('src/game/weapons/WeaponSystem.ts');
const { CompanionSystem } = load('src/game/systems/CompanionSystem.ts');
const { GameEngine } = load('src/game/engine/GameEngine.ts');
const plain = value => JSON.parse(JSON.stringify(value));
const counters = { fruits: 0, waterKills: 0, evolvedPredators: 0, bosses: 0, gold: 0, level: 1 };
const vfx = { addDamageNumber() {}, addSparks() {} };
function player() {
  return new Player({ id: 'test', name: 'Teste', startingWeapon: 'wand', statBonuses: {} });
}
function missionEngine() {
  const engine = Object.create(GameEngine.prototype);
  const stages = createForestStages('hard');
  stages[0].missions = [{ id: 'fruit', title: 'Frutas', metric: 'fruits', target: 2 }, { id: 'gold', title: 'Ouro', metric: 'gold', target: 10 }];
  Object.assign(engine, { player: player(), amazonTurns: stages, unlockedCompanions: [], isPaused: true,
    isGameOver: false, insideCave: false, bossEncounter: null, nearHunter: true,
    waveDirector: { isAmazonForest: true, survivalTime: 0 }, goldCollected: 50,
    amazonObjectives: { fruitsCollected: 10, waterKills: 0, evolvedPredatorsDefeated: 0, folkloreBossesDefeated: 0 },
    hunterQuest: { accepted: true, fish: 12, completed: false }, sound: { playMissionClaim() {} },
    syncHUD() {}, callbacks: { onHunterDialogue() {} } });
  engine.tribeHunter = { canInteract: () => engine.nearHunter };
  return engine;
}

test('difficulty counts and exact stage boundaries; skipped stages do not lock later ones', () => {
  for (const [difficulty, count] of [['easy', 1], ['normal', 1], ['hard', 2], ['nightmare', 3], ['infernal', 3]]) {
    const stages = createForestStages(difficulty);
    assert.ok(stages.every(stage => stage.missions.length === count && new Set(stage.missions.map(m => m.id)).size === count));
  }
  const stages = createForestStages('normal');
  for (const [time, turn] of [[0, 1], [299.99, 1], [300, 2], [899.99, 2], [900, 3], [1199.99, 3]]) {
    const stage = currentForestStage(stages, time);
    assert.equal(stage.turn, turn);
    assert.equal(forestStageView(stage, counters, time, []).status, 'available');
  }
  assert.equal(forestStageView(stages[2], counters, 1200, []).status, 'expired');
});

test('only accepted actions count; every objective is required; level uses current value', () => {
  const e = missionEngine();
  assert.equal(e.getHunterForestMission().missions[0].progress, 0);
  assert.equal(e.deliverForestStage(), false);
  assert.equal(e.acceptForestStage(), true);
  e.amazonObjectives.fruitsCollected += 2;
  assert.equal(e.getHunterForestMission().status, 'accepted');
  assert.equal(e.deliverForestStage(), false);
  assert.equal(e.acceptForestStage(), false); // Cannot reset the baseline.
  e.goldCollected += 10;
  assert.equal(e.getHunterForestMission().status, 'ready');
  const stage = e.amazonTurns[0];
  stage.missions = [{ id: 'level', metric: 'level', title: 'Nível', target: 10 }];
  e.player.level = 10;
  assert.equal(e.getHunterForestMission().status, 'ready');
});

test('accept/deliver requires proximity and dialogue; late deliveries never unlock rewards', () => {
  const e = missionEngine();
  e.nearHunter = false; assert.equal(e.acceptForestStage(), false);
  e.nearHunter = true; e.isPaused = false; assert.equal(e.acceptForestStage(), false);
  e.isPaused = true; assert.equal(e.acceptForestStage(), true);
  e.amazonObjectives.fruitsCollected += 2; e.goldCollected += 10;
  e.nearHunter = false; assert.equal(e.deliverForestStage(), false);
  e.nearHunter = true; e.waveDirector.survivalTime = 300;
  assert.equal(e.deliverForestStage(), false);
  assert.equal(e.getHunterForestMission().turn, 2);
  assert.equal(e.acceptForestStage(), true);
  e.waveDirector.survivalTime = 1200;
  assert.equal(e.acceptForestStage(), false);
  assert.equal(e.deliverForestStage(), false);
});

test('delivery persists per character, does not auto-equip, duplicate or overwrite fish quest', () => {
  storage.clear();
  const data = getInitialSave();
  data.inventories.test = { ...emptyInventory(), hunterQuest: { accepted: true, fish: 12, completed: false } };
  data.inventories.other = emptyInventory();
  saveGameData(data);
  const e = missionEngine(); e.acceptForestStage();
  e.amazonObjectives.fruitsCollected += 2; e.goldCollected += 10;
  assert.equal(e.deliverForestStage(), true);
  assert.equal(e.deliverForestStage(), false);
  const saved = loadSavedData();
  assert.deepEqual(plain(saved.inventories.test.unlockedCompanions), ['frog']);
  assert.deepEqual(plain(saved.inventories.test.equippedCompanions), []);
  assert.deepEqual(plain(saved.inventories.other.unlockedCompanions), []);
  assert.equal(saved.inventories.test.hunterQuest.fish, 12);
  assert.equal(unlockCompanion(saved.inventories.test, 'frog'), saved.inventories.test);
});

test('old/malformed saves normalize companion ownership and equipment defensively', () => {
  const clean = normalizeInventories({ old: { items: [], equipped: {} } });
  assert.deepEqual(plain(clean.old.unlockedCompanions), []);
  const value = normalizeCompanions(['frog', 'frog', 'invalid', 'turtle'], ['frog', 'butterfly', 'frog', 'turtle', 'invalid']);
  assert.deepEqual(plain(value), { unlockedCompanions: ['frog', 'turtle'], equippedCompanions: ['frog', 'turtle'] });
  assert.deepEqual(plain(normalizeCompanions(null, {})), { unlockedCompanions: [], equippedCompanions: [] });
});

test('frog heals on schedule, caps at max HP and never revives a dead hero', () => {
  const p = player(), system = new CompanionSystem(p, ['frog']);
  p.hp = 90; system.update(4, p, vfx); assert.equal(p.hp, 90);
  system.update(1, p, vfx); assert.equal(p.hp, 92);
  p.hp = 99; system.update(5, p, vfx); assert.equal(p.hp, 100);
  p.hp = 0; system.update(5, p, vfx); assert.equal(p.hp, 0);
});

test('turtle absorbs reduced damage, preserves i-frames, renews without stacking', () => {
  const p = player(), system = new CompanionSystem(p, ['turtle']);
  assert.equal(p.companionShield, 20);
  p.takeDamage(10); assert.equal(p.hp, 100); assert.equal(p.companionShield, 10);
  p.takeDamage(10); assert.equal(p.companionShield, 10);
  p.invulnerableTimer = 0; p.takeDamage(30); assert.equal(p.hp, 80); assert.equal(p.companionShield, 0);
  system.update(19, p, vfx); assert.equal(p.companionShield, 0);
  system.update(1, p, vfx); assert.equal(p.companionShield, 20);
  system.update(20, p, vfx); assert.equal(p.companionShield, 20);
  p.invulnerableTimer = 0; p.shieldTimer = 10; p.armor = 2;
  p.takeDamage(20); assert.equal(p.companionShield, 12); assert.equal(p.hp, 80);
});

test('butterfly stacks with passives and survives repeated attribute recalculations', () => {
  const p = player(), weapons = new WeaponSystem('garras_onca');
  new CompanionSystem(p, ['butterfly']);
  weapons.recalculatePlayerStats(p); assert.equal(p.speed, p.baseSpeed * 1.15);
  weapons.addPassive('wings', p);
  const speed = p.speed; assert.ok(speed > p.baseSpeed * 1.15);
  weapons.recalculatePlayerStats(p); assert.equal(p.speed, speed);
});

test('loadout is a run snapshot; pauses and terminal states freeze companion timers', () => {
  const p = player(), ids = ['frog'], system = new CompanionSystem(p, ids);
  ids.push('turtle'); assert.equal(system.ids.length, 1);
  p.hp = 90;
  const e = Object.create(GameEngine.prototype);
  Object.assign(e, { isRunning: true, isPaused: true, isGameOver: false, lastTime: 0, fpsTimer: 0, frameCount: 0,
    debugConfig: { timeScale: 1 }, lastRenderedAt: 0, render() {}, update: dt => system.update(dt, p, vfx) });
  e.loop(5000); assert.equal(p.hp, 90);
  e.isPaused = false; e.isGameOver = true; e.loop(10000); assert.equal(p.hp, 90);
  e.isGameOver = false;
  for (let i = 1; i <= 51; i++) e.loop(10000 + i * 100);
  assert.equal(p.hp, 92);
  const nextRun = new CompanionSystem(p, ['frog']);
  nextRun.update(1, p, vfx); assert.equal(p.hp, 92);
});

test('equipment selection rejects unowned/mismatched items, replaces without consuming, and persists independently', () => {
  const inventory = { ...emptyInventory(), items: [FOREST_ARMOR, GUARDIAN_BOW,
    { id: 'second_armor', name: 'Outra armadura', slot: 'armor', stats: { armor: 1 } }], unlockedCompanions: ['frog'], equippedCompanions: ['frog'] };
  assert.equal(equipInventoryItem(inventory, 'armor', 'missing'), inventory);
  assert.equal(equipInventoryItem(inventory, 'helmet', FOREST_ARMOR.id), inventory);
  const first = equipInventoryItem(inventory, 'armor', FOREST_ARMOR.id);
  assert.equal(getEquipmentBonuses(first).armor, 3);
  assert.equal(inventory.equipped.armor, undefined);
  const second = equipInventoryItem(first, 'armor', 'second_armor');
  assert.equal(getEquipmentBonuses(second).armor, 1);
  assert.equal(second.items.length, 3);
  const removed = equipInventoryItem(second, 'armor');
  assert.equal(removed.equipped.armor, undefined);
  assert.equal(removed.equippedCompanions, inventory.equippedCompanions);
  assert.equal(equipInventoryItem(removed, 'armor'), removed);
  const save = getInitialSave(); save.inventories.test = first; save.inventories.other = emptyInventory();
  saveGameData(save);
  const reloaded = loadSavedData();
  assert.equal(reloaded.inventories.test.equipped.armor, FOREST_ARMOR.id);
  assert.deepEqual(plain(reloaded.inventories.test.equippedCompanions), ['frog']);
  assert.deepEqual(plain(reloaded.inventories.other.equipped), {});
});

test('classic sheet renders real item artwork, fallback icons, per-hero bonuses and compact locked companions', () => {
  const { CharacterLoadoutScreen } = load('src/components/game/CharacterLoadoutScreen.tsx');
  const data = getInitialSave();
  const inventory = { ...emptyInventory(), items: [FOREST_ARMOR, GUARDIAN_BOW,
    { id: 'no_art', name: 'Botas de teste', slot: 'boots', stats: {} }], unlockedCompanions: ['frog'], equippedCompanions: ['frog'] };
  data.inventories.test = equipInventoryItem(inventory, 'armor', FOREST_ARMOR.id);
  const character = { id: 'test', name: 'Herói Teste', title: 'Aventureiro', iconName: 'Sword', statBonuses: {} };
  const html = renderToStaticMarkup(React.createElement(CharacterLoadoutScreen, { character, savedData: data, onUpdateSave() {}, onBack() {} }));
  assert.ok(html.includes('Ficha de equipamentos de Herói Teste'));
  assert.ok(html.includes('/sprites/equipment/forest-armor.png'));
  assert.ok(html.includes('/sprites/equipment/guardian-bow.svg'));
  assert.ok(html.includes('Equipar Botas de teste'));
  assert.ok(html.includes('Desequipar Armadura da Mata'));
  assert.ok(html.includes('+3 Armadura'));
  assert.ok(html.includes('Sapo curandeiro: equipado'));
  assert.ok(html.includes('Tartaruga guardiã: bloqueado'));
  assert.ok(html.includes('Habilidades e desbloqueios'));
  assert.ok(html.includes('Voltar aos personagens'));
  const emptyHtml = renderToStaticMarkup(React.createElement(CharacterLoadoutScreen, { character: { ...character, id: 'other', name: 'Outro' }, savedData: data, onUpdateSave() {}, onBack() {} }));
  assert.ok(emptyHtml.includes('Inventário vazio'));
  assert.ok(!emptyHtml.includes('Desequipar Armadura da Mata'));
});
