import { DifficultyConfig, EnemyType, MapId } from '../types';
import { Enemy } from '../entities/Enemy';
import { BabyCaiman } from '../entities/BabyCaiman';
import { Player } from '../entities/Player';
import { Camera } from '../engine/Camera';
import { SoundEngine } from '../engine/SoundEngine';
import { WorldSystem } from './WorldProps';

const AMAZON_BASIC_ENEMIES: EnemyType[] = [
  'bullet_ant',
  'leafcutter_ant',
  'blue_butterfly',
  'cicada',
  // Nocturnal forest bat: regular fauna that used to appear only as a
  // Matinta Pereira summon or through the DevTools spawn button.
  'bat',
];

const AMAZON_MEDIUM_ENEMIES: EnemyType[] = [
  'poison_dart_frog',
  'praying_mantis',
  'stick_bug',
  'toucan',
];

const AMAZON_RESISTANT_ENEMIES: EnemyType[] = [
  'capybara',
  'sloth',
  'rhino_beetle',
  'sawyer_beetle',
  'giant_centipede',
];

// Rare Amazon Forest elites. Spawned on a slow independent timer so they stay
// uncommon even when the regular spawn rate is very high.
const AMAZON_ELITE_ENEMIES: EnemyType[] = [
  'sucuri',
  'elite_jaguar',
  'elite_tapir',
  'elite_goliath_spider',
  'elite_black_caiman',
];

// Aquatic Amazon Forest fauna. These are only ever spawned on top of real
// water and are kept there by the engine's aquatic movement resolver.
const AMAZON_AQUATIC_BASIC_ENEMIES: EnemyType[] = ['piranha'];
const AMAZON_AQUATIC_MEDIUM_ENEMIES: EnemyType[] = ['pink_river_dolphin'];
const AMAZON_AQUATIC_RESISTANT_ENEMIES: EnemyType[] = ['giant_otter'];
const AMAZON_AQUATIC_ELITE_ENEMIES: EnemyType[] = ['elite_black_caiman'];

// Boss waves: 05:00, 09:00, 14:00 and 17:30. Each wave brings more folklore
// bosses than the last (1 -> 2 -> 3 -> 4), so all ten bosses still appear in a
// single run without a boss spawning every 90 seconds.
const AMAZON_BOSS_WAVE_TIMES = [300, 540, 840, 1050];
const AMAZON_BOSS_WAVE_COUNTS = [1, 2, 3, 4];
const AMAZON_BOSS_ORDER: EnemyType[] = [
  'boss_curupira',
  'boss_saci',
  'boss_boto',
  'boss_iara',
  'boss_caipora',
  'boss_matinta',
  'boss_vitoria_regia',
  'boss_mapinguari',
  'boss_cobra_grande',
  'boss_boitata',
];

// Siege events: a full ring of fauna closes in on the hero. Each siege also
// brings an elite, which guarantees a chest once it dies.
const AMAZON_SIEGES: {
  time: number;
  key: string;
  type: EnemyType;
  hp: number;
  name: string;
  alert: string;
}[] = [
  {
    time: 150,
    key: 'siege_150',
    type: 'bullet_ant',
    hp: 0.95,
    name: 'Vanguarda do Cerco',
    alert: '🐜 CERCO DE FORMIGAS-BALA! A MATA FECHOU O CERCO!',
  },
  {
    time: 450,
    key: 'siege_450',
    type: 'sawyer_beetle',
    hp: 1.1,
    name: 'Carniceiro do Cerco',
    alert: '🪲 CERCO DE BESOUROS-SERRADORES!',
  },
  {
    time: 660,
    key: 'siege_660',
    type: 'bat',
    hp: 1.2,
    name: 'Senhor do Cerco Noturno',
    alert: '🦇 CERCO NOTURNO DE MORCEGOS!',
  },
];

// On Hard, Nightmare and Infernal the simultaneous Amazon bosses are no
// longer copies of the same boss: each wave is announced with a fixed
// elemental combo name.
const AMAZON_ELEMENTAL_COMBOS: { name: string; types: EnemyType[] }[] = [
  {
    name: 'Combo da Pira Sagrada',
    types: ['boss_curupira', 'boss_boitata', 'boss_caipora'],
  },
  {
    name: 'Combo da Correnteza Divina',
    types: ['boss_boto', 'boss_iara', 'boss_vitoria_regia'],
  },
  {
    name: 'Combo do Clamor Sônico',
    types: ['boss_saci', 'boss_matinta'],
  },
  {
    name: 'Combo dos Titãs Colossais',
    types: ['boss_mapinguari', 'boss_cobra_grande'],
  },
];

export class WaveDirector {
  public survivalTime: number = 0;
  public difficulty: DifficultyConfig;
  private mapId: MapId;
  private worldProps: WorldSystem | null;
  private nextEnemyId: number = 1;
  private spawnTimer: number = 0;
  private nextAmazonEliteTime: number = 80 + Math.random() * 40;
  private nextAmazonEliteHordeTime: number = 1120;
  private amazonBossOrderPointer: number = 0;
  // The adult Jacaré-açu and its hatchling are tracked on independent timers
  // so the baby mechanic can never starve the adult out of the spawn rotation.
  private nextAmazonCaimanTime: number = 45 + Math.random() * 30;
  private nextAmazonBabyCaimanTime: number = 35 + Math.random() * 25;
  private initialCaimanSpawned: boolean = false;

  constructor(
    difficulty: DifficultyConfig,
    mapId: MapId = 'amazon_forest',
    worldProps: WorldSystem | null = null
  ) {
    this.difficulty = difficulty;
    this.mapId = mapId;
    this.worldProps = worldProps;
  }

  public get isAmazonForest(): boolean {
    return this.mapId === 'amazon_forest';
  }

  /**
   * Next scheduled set piece (siege or boss wave) for the HUD countdown.
   * Regular hordes are constant, so only the scripted events are announced.
   */
  public getNextEvent(): { label: string; remaining: number } | undefined {
    if (!this.isAmazonForest) return undefined;
    const candidates: { time: number; label: string }[] = [];
    AMAZON_BOSS_WAVE_TIMES.forEach((time, index) => {
      if (!this.triggeredEvents.has(`boss_wave_${index}`)) {
        candidates.push({ time, label: 'Onda de chefes' });
      }
    });
    for (const siege of AMAZON_SIEGES) {
      if (!this.triggeredEvents.has(siege.key)) {
        candidates.push({ time: siege.time, label: siege.name });
      }
    }
    const next = candidates
      .filter((event) => event.time > this.survivalTime)
      .sort((a, b) => a.time - b.time)[0];
    if (!next) return undefined;
    return {
      label: next.label,
      remaining: Math.max(0, Math.ceil(next.time - this.survivalTime)),
    };
  }

  // Event flags to ensure one-time triggers
  public eventAlert: string | null = null;
  public eventAlertTimer: number = 0;
  private triggeredEvents: Set<string> = new Set();
  public bossActive: Enemy | null = null;
  public isEndless: boolean = false;
  public freezeSpawns: boolean = false;

  update(
    dt: number,
    player: Player,
    camera: Camera,
    enemies: Enemy[],
    sound: SoundEngine,
    onSpawn: (enemy: Enemy) => void
  ): void {
    this.survivalTime += dt;
    this.spawnTimer += dt;

    if (this.eventAlertTimer > 0) {
      this.eventAlertTimer -= dt;
      if (this.eventAlertTimer <= 0) {
        this.eventAlert = null;
      }
    }

    // Check boss status
    if (this.bossActive && this.bossActive.hp <= 0) {
      this.bossActive = enemies.find((e) => e.isBoss && e.hp > 0) ?? null;
    }

    // Smooth early scaling + steeper late/endless scaling. The HP curve is
    // gentler than before because the horde now keeps growing in size and
    // frequency instead of flattening out at the six-minute mark.
    const minutes = this.survivalTime / 60;
    const endlessExtra = minutes > 5 ? Math.pow(minutes - 5, 1.35) * 0.45 : 0;
    const hpMultiplier = (1.0 + minutes * 0.44 + endlessExtra) * this.difficulty.enemyHp;
    const spawnInterval = Math.max(0.07, 0.56 - minutes * 0.085) / this.difficulty.spawnRate;
    const maxEnemies = Math.min(
      760,
      Math.floor((95 + Math.floor(minutes * 58)) * this.difficulty.enemyCount)
    );

    // While an Amazon boss is alive, regular mobs spawn at half the usual rate.
    const amazonBossFight =
      this.isAmazonForest && enemies.some((e) => e.isBoss && e.hp > 0);
    const effectiveSpawnInterval = amazonBossFight ? spawnInterval * 2 : spawnInterval;

    // Regular interval spawning
    if (!this.freezeSpawns && this.spawnTimer >= effectiveSpawnInterval && enemies.length < maxEnemies) {
      this.spawnTimer = 0;
      this.spawnRegularEnemy(player, camera, hpMultiplier, onSpawn);
    }

    if (this.freezeSpawns) {
      return;
    }

    // The adult Jacaré-açu is guaranteed at the start of an Amazon run and then
    // keeps its own slow spawn cycle. The hatchling spawns independently on a
    // faster timer. Both still obey the map's overall enemy cap.
    if (this.isAmazonForest) {
      if (!this.initialCaimanSpawned && enemies.length < maxEnemies) {
        this.initialCaimanSpawned = true;
        const pos =
          this.getWaterSpawnPosition(camera, 44) ??
          (this.worldProps
            ? this.worldProps.getNearestRiverPoint(camera.x)
            : this.getSpawnPositionOutsideScreen(camera));
        onSpawn(this.createEnemy('elite_black_caiman', pos.x, pos.y, hpMultiplier));
      }

      if (this.survivalTime >= this.nextAmazonCaimanTime && enemies.length < maxEnemies) {
        this.nextAmazonCaimanTime = this.survivalTime + 50 + Math.random() * 35;
        const waterPos = this.getWaterSpawnPosition(camera, 44);
        const pos =
          waterPos ??
          (this.worldProps && Math.random() < 0.4
            ? this.worldProps.getNearestRiverPoint(camera.x)
            : this.getSpawnPositionOutsideScreen(camera));
        const adult = this.createEnemy(
          'elite_black_caiman',
          pos.x,
          pos.y,
          hpMultiplier * 1.05
        );
        this.triggerAlert(
          waterPos
            ? `⚠️ ${adult.name.toUpperCase()} SURGIU NO RIO!`
            : `⚠️ ${adult.name.toUpperCase()} SURGIU NA FLORESTA!`,
          4.5
        );
        onSpawn(adult);
      }

      if (this.survivalTime >= this.nextAmazonBabyCaimanTime && enemies.length < maxEnemies) {
        this.nextAmazonBabyCaimanTime = this.survivalTime + 35 + Math.random() * 25;
        const pos = this.getWaterSpawnPosition(camera, 24);
        if (pos) {
          onSpawn(this.createEnemy('baby_black_caiman', pos.x, pos.y, hpMultiplier * 0.75));
        }
      }
    }

    // Rare Amazon Forest elite: one of the map's oversized predators appears
    // from time to time on top of the regular waves. Elites wait while a boss
    // is alive so both events never compete for the same spotlight. The Jacaré-
    // açu only replaces the land elite when there is water just outside the
    // camera.
    if (
      this.isAmazonForest &&
      !amazonBossFight &&
      this.survivalTime >= this.nextAmazonEliteTime &&
      enemies.length < maxEnemies
    ) {
      this.nextAmazonEliteTime = this.survivalTime + 120 + Math.random() * 60;
      let eliteType =
        AMAZON_ELITE_ENEMIES[Math.floor(Math.random() * AMAZON_ELITE_ENEMIES.length)];
      let elitePos = this.getSpawnPositionOutsideScreen(camera);
      let aquaticElite = false;

      if (Math.random() < 0.4) {
        const waterPos = this.getWaterSpawnPosition(camera, 44);
        if (waterPos) {
          eliteType =
            AMAZON_AQUATIC_ELITE_ENEMIES[
              Math.floor(Math.random() * AMAZON_AQUATIC_ELITE_ENEMIES.length)
            ];
          elitePos = waterPos;
          aquaticElite = true;
        }
      }

      const amazonElite = this.createEnemy(eliteType, elitePos.x, elitePos.y, hpMultiplier * 1.05);
      this.triggerAlert(
        aquaticElite
          ? `⚠️ ${amazonElite.name.toUpperCase()} SURGIU NO RIO!`
          : `⚠️ ${amazonElite.name.toUpperCase()} SURGIU NA FLORESTA!`,
        4.5
      );
      sound.playBossWarning();
      onSpawn(amazonElite);
    }

    // Timed Events (4 Elite Chests before 05:00 + Amazon boss waves + Endless Loop)
    const sec = Math.floor(this.survivalTime);

    // Event 1: 01:00 - Bullet-Ant Swarm + Vanguard Elite (#1 Chest)
    if (sec >= 60 && !this.triggeredEvents.has('wave_60')) {
      this.triggeredEvents.add('wave_60');
      this.triggerAlert('🐜 ENXAME DE FORMIGAS-BALA E GUARDA ELITE SURGIRAM!', 4.5);
      sound.playBossWarning();
      this.spawnSwarm(player, camera, 'bullet_ant', onSpawn);
      this.spawnElite(player, camera, hpMultiplier * 0.75, 'Capitão da Guarda Elite', onSpawn);
    }

    // Event 3: 03:00 - Leafcutter-Ant Ring + Butcher Elite (#3 Chest)
    if (sec >= 180 && !this.triggeredEvents.has('wave_180')) {
      this.triggeredEvents.add('wave_180');
      this.triggerAlert('🐜 CERCO DE FORMIGAS-CORTADEIRAS COM CARNICEIRO ELITE!', 4.5);
      sound.playBossWarning();
      this.spawnRingEnemies(player, hpMultiplier, 'leafcutter_ant', onSpawn);
      this.spawnElite(player, camera, hpMultiplier * 1.05, 'Carniceiro Elite', onSpawn);
    }

    // Event 4: 04:00 - Spectral General Elite (#4 Chest)
    if (sec >= 240 && !this.triggeredEvents.has('wave_240')) {
      this.triggeredEvents.add('wave_240');
      this.triggerAlert('⚔️ GENERAL ESPECTRAL ELITE SURGIU!', 5);
      sound.playBossWarning();
      this.spawnElite(player, camera, hpMultiplier * 1.15, 'General Espectral Elite', onSpawn);
      if (this.difficulty.enemyCount >= 1.15) {
        this.spawnElite(player, camera, hpMultiplier, 'Guardião Sombrio Elite', onSpawn);
      }
    }

    // Siege events: a full ring of fauna closes in on the hero. Each siege
    // also brings an elite, which guarantees a chest once it dies.
    for (const siege of AMAZON_SIEGES) {
      if (sec >= siege.time && !this.triggeredEvents.has(siege.key)) {
        this.triggeredEvents.add(siege.key);
        this.triggerAlert(siege.alert, 4.5);
        sound.playBossWarning();
        this.spawnRingEnemies(player, hpMultiplier * siege.hp, siege.type, onSpawn);
        this.spawnElite(player, camera, hpMultiplier * 1.05, siege.name, onSpawn);
      }
    }

    // Event 5: Amazon boss waves at 05:00, 09:00, 14:00 and 17:30. Each wave
    // brings more folklore bosses than the last (1 -> 2 -> 3 -> 4), so all ten
    // bosses still appear across a single run without a boss every 90 s.
    if (this.isAmazonForest) {
      const bossWaveIndex = AMAZON_BOSS_WAVE_TIMES.findIndex(
        (time, index) => sec >= time && !this.triggeredEvents.has(`boss_wave_${index}`)
      );
      if (bossWaveIndex >= 0) {
        this.triggeredEvents.add(`boss_wave_${bossWaveIndex}`);
        this.spawnAmazonBossWave(camera, hpMultiplier, onSpawn, sound, bossWaveIndex);
      }
    }

    // After the last boss wave, the forest keeps the pressure up with intense
    // elite packs until the 20:00 mark.
    if (
      this.isAmazonForest &&
      sec >= 1110 &&
      sec < 1200 &&
      sec >= this.nextAmazonEliteHordeTime &&
      enemies.length < 380
    ) {
      this.nextAmazonEliteHordeTime = sec + 12;
      this.spawnAmazonEliteHorde(camera, hpMultiplier, onSpawn);
      this.triggerAlert('🔥 HORDA DE ELITES DA MATA!', 3.5);
      sound.playBossWarning();
    }

    // Endless Mode Events (> 05:00): Every 60s Elite + Wave.
    if (this.isEndless && sec >= 360) {
      const minuteMark = Math.floor(sec / 60);
      const endlessKey = `endless_min_${minuteMark}`;
      if (!this.triggeredEvents.has(endlessKey)) {
        this.triggeredEvents.add(endlessKey);
        sound.playBossWarning();
        this.triggerAlert(`🔥 ONDA INFINITA DO MINUTO ${minuteMark}: CAÇADORES ELITE!`, 4.5);
        const ringType: EnemyType = minuteMark % 2 === 0 ? 'blue_butterfly' : 'cicada';
        this.spawnRingEnemies(player, hpMultiplier * 0.95, ringType, onSpawn);
        this.spawnElite(player, camera, hpMultiplier * 1.1, 'Executor Abissal Elite', onSpawn);
      }
    }
  }

  private triggerAlert(text: string, duration: number = 4): void {
    this.eventAlert = text;
    this.eventAlertTimer = duration;
  }

  private getSpawnPositionOutsideScreen(camera: Camera): { x: number; y: number } {
    const margin = 70;
    const halfW = camera.viewportWidth / 2 + margin;
    const halfH = camera.viewportHeight / 2 + margin;

    const side = Math.floor(Math.random() * 4);
    let x = camera.x;
    let y = camera.y;

    if (side === 0) {
      x += (Math.random() - 0.5) * 2 * halfW;
      y -= halfH;
    } else if (side === 1) {
      x += halfW;
      y += (Math.random() - 0.5) * 2 * halfH;
    } else if (side === 2) {
      x += (Math.random() - 0.5) * 2 * halfW;
      y += halfH;
    } else {
      x -= halfW;
      y += (Math.random() - 0.5) * 2 * halfH;
    }

    return { x, y };
  }

  private getWaterSpawnPosition(camera: Camera, radius: number): { x: number; y: number } | null {
    if (!this.worldProps) return null;

    // The off-screen spawn ring is sampled until it intersects the river or a
    // lake. If this part of the map has no water nearby, callers fall back to
    // the regular land fauna instead of dropping an aquatic enemy on dry land.
    for (let i = 0; i < 24; i++) {
      const pos = this.getSpawnPositionOutsideScreen(camera);
      if (this.worldProps.isNavigableWater(pos.x, pos.y, radius)) return pos;
    }
    return null;
  }

  private spawnRegularEnemy(
    player: Player,
    camera: Camera,
    hpMult: number,
    onSpawn: (enemy: Enemy) => void
  ): void {
    const pos = this.getSpawnPositionOutsideScreen(camera);
    const minutes = this.survivalTime / 60;

    // The forest starts with its fast basic fauna and gradually mixes in
    // tougher medium threats, then slow high-HP resistant fauna.
    const mediumChance = Math.min(0.55, Math.max(0, (minutes - 0.5) * 0.16));
    const resistantChance = Math.min(0.3, Math.max(0, (minutes - 2) * 0.07));
    const isResistant = Math.random() < resistantChance;
    const isMedium = !isResistant && Math.random() < mediumChance;

    // A share of the forest waves comes from the river fauna. The spawn is
    // only accepted when the off-screen point is genuinely over water.
    if (Math.random() < 0.28) {
      const aquaticPool = isResistant
        ? AMAZON_AQUATIC_RESISTANT_ENEMIES
        : isMedium
          ? AMAZON_AQUATIC_MEDIUM_ENEMIES
          : AMAZON_AQUATIC_BASIC_ENEMIES;
      const aquaticType = aquaticPool[Math.floor(Math.random() * aquaticPool.length)];
      const aquaticPos = this.getWaterSpawnPosition(camera, 24);
      if (aquaticPos) {
        onSpawn(this.createEnemy(aquaticType, aquaticPos.x, aquaticPos.y, hpMult));
        return;
      }
    }

    const pool = isResistant
      ? AMAZON_RESISTANT_ENEMIES
      : isMedium
        ? AMAZON_MEDIUM_ENEMIES
        : AMAZON_BASIC_ENEMIES;
    const type = pool[Math.floor(Math.random() * pool.length)];

    onSpawn(this.createEnemy(type, pos.x, pos.y, hpMult));
  }

  /** Enemy type spawned by boss summon skills in the forest. */
  public getMinionEnemyType(): EnemyType {
    return 'bullet_ant';
  }

  public createEnemy(type: EnemyType, x: number, y: number, hpMult: number): Enemy {
    const enemy =
      type === 'baby_black_caiman'
        ? new BabyCaiman(this.nextEnemyId++, x, y, hpMult)
        : new Enemy(this.nextEnemyId++, type, x, y, hpMult);
    enemy.damage = Math.max(1, Math.round(enemy.damage * this.difficulty.enemyDamage));
    enemy.xpValue = Math.max(1, Math.round(enemy.xpValue * this.difficulty.xpMultiplier));

    // Amazon night (10:00–20:00): newly spawned animals start in frenzy.
    const amazonNight = this.isAmazonForest && this.survivalTime >= 600;
    if (amazonNight) {
      enemy.isAmazonNight = true;
      if (enemy.isEcologyPredator) {
        enemy.ecologyHuntTimer *= 0.5;
      }
    }

    return enemy;
  }

  private spawnSwarm(
    player: Player,
    camera: Camera,
    type: EnemyType,
    onSpawn: (enemy: Enemy) => void
  ): void {
    const count = Math.round(32 * this.difficulty.enemyCount);
    for (let i = 0; i < count; i++) {
      const pos = this.getSpawnPositionOutsideScreen(camera);
      onSpawn(this.createEnemy(type, pos.x, pos.y, 0.85));
    }
  }

  private spawnRingEnemies(
    player: Player,
    hpMult: number,
    type: EnemyType,
    onSpawn: (enemy: Enemy) => void
  ): void {
    const count = Math.round(26 * this.difficulty.enemyCount);
    const radius = 420;
    for (let i = 0; i < count; i++) {
      const angle = (i * Math.PI * 2) / count;
      const x = player.x + Math.cos(angle) * radius;
      const y = player.y + Math.sin(angle) * radius;
      onSpawn(this.createEnemy(type, x, y, hpMult));
    }
  }

  private spawnElite(
    player: Player,
    camera: Camera,
    hpMult: number,
    customName: string,
    onSpawn: (enemy: Enemy) => void
  ): void {
    const pos = this.getSpawnPositionOutsideScreen(camera);
    // The timed elite slots use the forest's own oversized predators.
    const eliteType = AMAZON_ELITE_ENEMIES[Math.floor(Math.random() * AMAZON_ELITE_ENEMIES.length)];
    const elite = this.createEnemy(eliteType, pos.x, pos.y, hpMult);
    elite.name = customName;
    onSpawn(elite);
  }

  private spawnAmazonBossWave(
    camera: Camera,
    hpMult: number,
    onSpawn: (enemy: Enemy) => void,
    sound: SoundEngine,
    waveIndex: number
  ): void {
    const simultaneous =
      this.difficulty.id === 'hard'
        ? 2
        : this.difficulty.id === 'nightmare' || this.difficulty.id === 'infernal'
          ? 3
          : 1;
    // Later waves bring more folklore bosses at once. Hard and above keep
    // their minimum of simultaneous bosses.
    const waveCount = AMAZON_BOSS_WAVE_COUNTS[waveIndex] ?? 1;
    const count = Math.max(waveCount, simultaneous);

    const bossTypes: EnemyType[] = [];
    for (let i = 0; i < count; i++) {
      bossTypes.push(AMAZON_BOSS_ORDER[this.amazonBossOrderPointer % AMAZON_BOSS_ORDER.length]);
      this.amazonBossOrderPointer += 1;
    }

    const combo =
      count > 1 ? AMAZON_ELEMENTAL_COMBOS[waveIndex % AMAZON_ELEMENTAL_COMBOS.length] : null;

    let bossName = '';
    for (let i = 0; i < bossTypes.length; i++) {
      const bossType = bossTypes[i];
      let pos = this.getSpawnPositionOutsideScreen(camera);
      // Iara, Boto and the Cobra-Grande are river spirits: try to make them
      // surface near the river or a lake when there is water just outside the
      // camera. The Cobra (Sucuri) must never start stranded on dry forest.
      if (
        bossType === 'boss_boto' ||
        bossType === 'boss_iara' ||
        bossType === 'boss_cobra_grande'
      ) {
        const waterPos = this.getWaterSpawnPosition(camera, 48);
        if (waterPos) {
          pos = waterPos;
        } else if (bossType === 'boss_cobra_grande' && this.worldProps) {
          pos = this.worldProps.getNearestRiverPoint(pos.x);
        }
      }

      const boss = this.createEnemy(bossType, pos.x, pos.y, hpMult);
      if (i === 0) {
        this.bossActive = boss;
        bossName = boss.name;
      }
      onSpawn(boss);
    }

    const alertName = combo ? combo.name : bossName;
    this.triggerAlert(`👑 ${alertName.toUpperCase()} SURGIU NA FLORESTA!`, 6);
    sound.playBossWarning();
    sound.playBossRoar();
  }

  private spawnAmazonEliteHorde(
    camera: Camera,
    hpMult: number,
    onSpawn: (enemy: Enemy) => void
  ): void {
    const eliteTypes: EnemyType[] = [
      'elite_jaguar',
      'elite_tapir',
      'elite_goliath_spider',
      'elite_black_caiman',
    ];
    const count = Math.max(2, Math.round(3 * this.difficulty.enemyCount));
    for (let i = 0; i < count; i++) {
      const pos = this.getSpawnPositionOutsideScreen(camera);
      const type = eliteTypes[Math.floor(Math.random() * eliteTypes.length)];
      onSpawn(this.createEnemy(type, pos.x, pos.y, hpMult * 1.1));
    }
  }

}
