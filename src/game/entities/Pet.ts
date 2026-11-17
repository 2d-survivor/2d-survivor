import { Camera } from '../engine/Camera';

export type PetAttackStyle = 'melee' | 'venom' | 'ranged' | 'charge';

/** Fauna species use their own hunting style once tamed. */
export function petAttackStyleFor(type: string): PetAttackStyle {
  switch (type) {
    case 'poison_dart_frog':
    case 'toucan':
    case 'blue_butterfly':
    case 'cicada':
    case 'bat':
      return 'ranged';
    case 'bullet_ant':
    case 'sawyer_beetle':
    case 'giant_centipede':
    case 'elite_goliath_spider':
      return 'venom';
    case 'rhino_beetle':
    case 'capybara':
    case 'piranha':
    case 'pink_river_dolphin':
    case 'giant_otter':
    case 'baby_black_caiman':
    case 'elite_jaguar':
    case 'elite_tapir':
    case 'elite_black_caiman':
      return 'charge';
    default:
      return 'melee';
  }
}

export function petAttackColor(style: PetAttackStyle, type: string): string {
  if (type === 'poison_dart_frog' || style === 'venom') return '#84cc16';
  if (style === 'charge') return '#f97316';
  if (style === 'ranged') return '#fbbf24';
  return '#4ade80';
}

const EVOLUTION_AGE = 60;
const EVOLUTION_HERO_LEVEL = 10;
const LEVEL_GROWTH = 0.15;

/**
 * A fauna companion tamed by the Domador de Feras. It chases the nearest
 * enemy, uses the hunting style of its original species and is always drawn
 * with a green/gold outline so it reads instantly as an ally.
 */
export class Pet {
  public x: number;
  public y: number;
  public radius: number = 12;
  public maxHp: number;
  public hp: number;
  public speed: number = 165;
  public damage: number;
  public attackTimer: number = 0;
  public contactTimer: number = 0;
  public facingX: number = 1;
  public animTimer: number = Math.random() * 10;
  public age: number = 0;
  public evolved: boolean = false;
  public armor: number = 0;
  /** Fraction of max HP regenerated per second (Elo Vital). */
  public regenPercent: number = 0;
  public readonly canEvolve: boolean;
  /** Tamed forest elites keep a heavier ranged attack than common fauna. */
  public readonly isElite: boolean;
  public readonly type: string;
  public readonly name: string;
  public readonly attackStyle: PetAttackStyle;
  public readonly attackColor: string;
  private readonly baseMaxHp: number;
  private readonly baseDamage: number;
  private syncedLevel: number = 1;
  private domadorHpMultiplier: number = 1;
  private domadorDamageMultiplier: number = 1;

  constructor(
    x: number,
    y: number,
    type: string,
    name: string,
    baseMaxHp: number,
    baseDamage: number,
    attackStyle: PetAttackStyle,
    canEvolve: boolean = true,
    isElite: boolean = false
  ) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.name = name;
    this.isElite = isElite;
    this.baseMaxHp = Math.max(24, Math.round(baseMaxHp));
    this.baseDamage = Math.max(1, baseDamage);
    this.attackStyle = attackStyle;
    this.attackColor = petAttackColor(attackStyle, type);
    this.canEvolve = canEvolve;
    this.maxHp = this.baseMaxHp;
    this.hp = this.maxHp;
    this.damage = this.baseDamage;
  }

  public get attackInterval(): number {
    switch (this.attackStyle) {
      case 'ranged':
        return 1.1;
      case 'venom':
        return 0.9;
      case 'charge':
        return 1.4;
      default:
        return 0.75;
    }
  }

  /** Hero levels grant +15% HP and damage per level (additive). */
  public syncHeroLevel(heroLevel: number): void {
    if (heroLevel === this.syncedLevel) return;
    const hpRatio = this.maxHp > 0 ? this.hp / this.maxHp : 1;
    this.syncedLevel = heroLevel;
    this.recomputeStats();
    this.hp = Math.max(1, Math.min(this.maxHp, Math.round(this.maxHp * hpRatio)));
  }

  /** Basic fauna evolves after 60s of survival once the hero reaches level 10. */
  public tryEvolve(heroLevel: number): boolean {
    if (this.evolved || !this.canEvolve) return false;
    if (heroLevel < EVOLUTION_HERO_LEVEL || this.age < EVOLUTION_AGE) return false;

    this.evolved = true;
    this.radius *= 1.35;
    this.speed *= 1.15;
    this.recomputeStats();
    this.hp = this.maxHp;
    return true;
  }

  /** Applies the Domador de Feras' exclusive pet upgrades, keeping the HP ratio. */
  public setDomadorBonuses(
    hpMultiplier: number,
    damageMultiplier: number,
    armor: number,
    regenPercent: number
  ): void {
    this.domadorHpMultiplier = Math.max(0.1, hpMultiplier);
    this.domadorDamageMultiplier = Math.max(0.1, damageMultiplier);
    this.armor = Math.max(0, armor);
    this.regenPercent = Math.max(0, regenPercent);
    const hpRatio = this.maxHp > 0 ? this.hp / this.maxHp : 1;
    this.recomputeStats();
    this.hp = Math.max(1, Math.min(this.maxHp, Math.round(this.maxHp * hpRatio)));
  }

  private recomputeStats(): void {
    const levelMultiplier = 1 + Math.max(0, this.syncedLevel - 1) * LEVEL_GROWTH;
    const evolutionMultiplier = this.evolved ? 2 : 1;
    this.maxHp = Math.max(
      1,
      Math.round(
        this.baseMaxHp * levelMultiplier * evolutionMultiplier * this.domadorHpMultiplier
      )
    );
    this.damage =
      this.baseDamage * levelMultiplier * evolutionMultiplier * this.domadorDamageMultiplier;
  }

  /** Move toward the target, stopping just inside biting range. */
  public update(dt: number, targetX: number | null, targetY: number | null): void {
    this.animTimer += dt;
    this.age += dt;
    if (this.attackTimer > 0) this.attackTimer -= dt;
    if (this.contactTimer > 0) this.contactTimer -= dt;
    if (this.regenPercent > 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * this.regenPercent * dt);
    }
    if (targetX === null || targetY === null) return;

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= 1) return;

    if (dx !== 0) this.facingX = dx > 0 ? 1 : -1;
    if (dist > this.radius + 18) {
      const chargeBoost = this.attackStyle === 'charge' && dist > 120 ? 1.6 : 1;
      const step = Math.min(dist, this.speed * chargeBoost * dt);
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }
  }

  public render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    if (!camera.isInView(this.x, this.y, 80)) return;

    const screen = camera.worldToScreen(this.x, this.y);
    const bob = Math.sin(this.animTimer * 8) * 1.6;

    ctx.save();
    ctx.translate(screen.x, screen.y + bob);
    ctx.scale(this.facingX, 1);

    // Green/gold ally aura; evolved pets glow brighter.
    ctx.shadowColor = this.evolved ? '#34d399' : '#fbbf24';
    ctx.shadowBlur = this.evolved ? 16 : 10;
    ctx.strokeStyle = this.evolved ? 'rgba(52, 211, 153, 0.95)' : 'rgba(251, 191, 36, 0.85)';
    ctx.lineWidth = this.evolved ? 2.6 : 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 1.55, 0, Math.PI * 2);
    ctx.stroke();

    // Little ground shadow.
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, this.radius * 0.9, this.radius * 0.9, this.radius * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body and head, outlined in gold/green.
    ctx.fillStyle = this.evolved ? '#065f46' : '#166534';
    ctx.strokeStyle = this.evolved ? '#34d399' : '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-2, 0, this.radius * 1.05, this.radius * 0.68, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(this.radius * 0.72, -this.radius * 0.28, this.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Ears and tail.
    ctx.beginPath();
    ctx.moveTo(this.radius * 0.5, -this.radius * 0.7);
    ctx.lineTo(this.radius * 0.68, -this.radius * 1.2);
    ctx.lineTo(this.radius * 0.86, -this.radius * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-this.radius * 1.0, 0);
    ctx.quadraticCurveTo(
      -this.radius * 1.7,
      -this.radius * 0.5,
      -this.radius * 1.45,
      -this.radius * 1.0
    );
    ctx.stroke();

    // Friendly golden eye.
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(this.radius * 0.92, -this.radius * 0.38, 1.9, 0, Math.PI * 2);
    ctx.fill();

    // Evolution crown mark.
    if (this.evolved) {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(-this.radius * 0.35, -this.radius * 1.35);
      ctx.lineTo(-this.radius * 0.15, -this.radius * 1.75);
      ctx.lineTo(0, -this.radius * 1.45);
      ctx.lineTo(this.radius * 0.15, -this.radius * 1.75);
      ctx.lineTo(this.radius * 0.35, -this.radius * 1.35);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();

    // Health bar while wounded.
    if (this.hp < this.maxHp) {
      const barWidth = 30 + (this.evolved ? 8 : 0);
      const pct = Math.max(0, Math.min(1, this.hp / this.maxHp));
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(screen.x - barWidth / 2, screen.y - this.radius * 2.2, barWidth, 4);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(screen.x - barWidth / 2, screen.y - this.radius * 2.2, barWidth * pct, 4);
      ctx.restore();
    }
  }
}
