import { Camera } from '../engine/Camera';
import {
  getPetAttackProfile,
  type PetAttackProfile,
  type PetDelivery,
  type PetRole,
} from '../data/petAttacks';
import type { EnemyType } from '../types';
import { Enemy } from './Enemy';

const EVOLUTION_AGE = 60;
const EVOLUTION_HERO_LEVEL = 10;
const LEVEL_GROWTH = 0.15;

/** Estouro da Matilha clones: fast, furious and short-lived. */
const CLONE_DURATION = 6;
const CLONE_SPEED_MULTIPLIER = 1.6;
const CLONE_ATTACK_SPEED_MULTIPLIER = 1.8;
const CLONE_DAMAGE_MULTIPLIER = 1.1;

/**
 * A fauna companion tamed by the Domador de Feras. It keeps the exact body of
 * the creature it was in the wild (reusing the enemy renderer) and only gets a
 * discreet green/gold ring under its feet so it still reads as an ally.
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
  /** Delivery/status/role matrix for this species. */
  public readonly profile: PetAttackProfile;
  public readonly role: PetRole;
  public readonly delivery: PetDelivery;
  public readonly attackColor: string;
  /** Pulses fired by this pet, used by the cicada's every-third stun. */
  public pulseCount: number = 0;
  /** Estouro da Matilha clone: temporary, off the pack bar and frantic. */
  public isClone: boolean = false;
  /** Remaining clone lifetime in seconds (0 for regular pets). */
  public cloneTimer: number = 0;
  private readonly baseMaxHp: number;
  private readonly baseDamage: number;
  private syncedLevel: number = 1;
  private domadorHpMultiplier: number = 1;
  private domadorDamageMultiplier: number = 1;
  /** Invisible enemy twin used only to draw the species' original body. */
  private readonly visual: Enemy;

  constructor(
    x: number,
    y: number,
    type: string,
    name: string,
    baseMaxHp: number,
    baseDamage: number,
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
    this.profile = getPetAttackProfile(type);
    this.role = this.profile.role;
    this.delivery = this.profile.delivery;
    this.attackColor = this.profile.color;
    this.canEvolve = canEvolve;
    this.maxHp = this.baseMaxHp;
    this.hp = this.maxHp;
    this.damage = this.baseDamage;
    // Draw the same creature body it had in the wild. The twin never takes
    // part in combat: it only mirrors position/animation and is rendered
    // without the elite/boss bars the enemy renderer would add.
    this.visual = new Enemy(0, type as EnemyType, x, y);
    this.visual.isElite = false;
    this.visual.isBoss = false;
  }

  public get attackInterval(): number {
    return this.isClone
      ? this.profile.cooldown / CLONE_ATTACK_SPEED_MULTIPLIER
      : this.profile.cooldown;
  }

  /**
   * Estouro da Matilha: builds a temporary twin of this pet at the given spot.
   * The clone keeps the species (body, delivery and statuses) but runs 60%
   * faster, attacks 80% faster and bites 10% harder.
   */
  public spawnClone(x: number, y: number): Pet {
    const clone = new Pet(
      x,
      y,
      this.type,
      this.name,
      this.baseMaxHp,
      this.baseDamage,
      false,
      this.isElite
    );
    clone.isClone = true;
    clone.cloneTimer = CLONE_DURATION;
    clone.syncedLevel = this.syncedLevel;
    clone.evolved = this.evolved;
    clone.radius = this.radius;
    clone.armor = this.armor;
    clone.regenPercent = this.regenPercent;
    clone.domadorHpMultiplier = this.domadorHpMultiplier;
    clone.domadorDamageMultiplier = this.domadorDamageMultiplier * CLONE_DAMAGE_MULTIPLIER;
    clone.recomputeStats();
    clone.hp = clone.maxHp;
    clone.speed = this.speed * CLONE_SPEED_MULTIPLIER;
    clone.facingX = this.facingX;
    return clone;
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
    // Stop just inside biting range. This used to be radius + 18, which is
    // farther than the bite reach for small prey, so big pets (elites with
    // radius 17) parked out of range and never attacked.
    if (dist > this.radius + 8) {
      const chargeBoost = this.profile.delivery === 'charge' && dist > 120 ? 1.6 : 1;
      const step = Math.min(dist, this.speed * chargeBoost * dt);
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }
  }

  public render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    if (!camera.isInView(this.x, this.y, 160)) return;

    const screen = camera.worldToScreen(this.x, this.y);

    // Glowing ally aura: a soft halo around the body plus a pulsing ring on
    // the ground. Gold for common tamed fauna, emerald once evolved and a
    // feral crimson for Estouro da Matilha clones.
    const glowRgb = this.isClone
      ? '248, 113, 113'
      : this.evolved
        ? '52, 211, 153'
        : '251, 191, 36';
    const pulse = 0.75 + Math.sin(this.animTimer * 4) * 0.25;
    const auraRadius = this.radius * (this.isElite ? 2.9 : 2.4);

    ctx.save();
    const halo = ctx.createRadialGradient(
      screen.x,
      screen.y,
      this.radius * 0.35,
      screen.x,
      screen.y,
      auraRadius
    );
    halo.addColorStop(0, `rgba(${glowRgb}, ${0.34 * pulse})`);
    halo.addColorStop(0.6, `rgba(${glowRgb}, ${0.14 * pulse})`);
    halo.addColorStop(1, `rgba(${glowRgb}, 0)`);
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, auraRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = `rgb(${glowRgb})`;
    ctx.shadowBlur = this.evolved ? 20 : 15;
    ctx.strokeStyle = `rgba(${glowRgb}, ${0.9 * pulse})`;
    ctx.lineWidth = this.evolved ? 2.8 : 2.2;
    ctx.beginPath();
    ctx.ellipse(
      screen.x,
      screen.y + this.radius * 0.8,
      this.radius * 1.35,
      this.radius * 0.55,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    ctx.restore();

    // Clones carry an extra dashed gold ring so they stand out even in a
    // crowded pack.
    if (this.isClone) {
      ctx.save();
      ctx.strokeStyle = `rgba(251, 191, 36, ${0.45 + 0.35 * pulse})`;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.ellipse(
        screen.x,
        screen.y + this.radius * 0.8,
        this.radius * 1.65,
        this.radius * 0.68,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();
    }

    // Same body, animation and facing the species uses in the wild.
    this.visual.x = this.x;
    this.visual.y = this.y;
    this.visual.animTimer = this.animTimer;
    this.visual.render(ctx, camera);

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
