import { CompanionId } from '../types';
import { Camera } from '../engine/Camera';
import { Player } from '../entities/Player';
import { VFXManager } from '../entities/VFX';

/** A snapshot of the menu loadout: rewards never change equipment mid-run. */
export class CompanionSystem {
  public readonly ids: readonly CompanionId[];
  private elapsed = 0;
  private healTimer = 0;
  private shieldTimer = 0;
  private positions: { id: CompanionId; x: number; y: number }[];

  constructor(player: Player, ids: CompanionId[]) {
    this.ids = [...new Set(ids)].slice(0, 3);
    this.positions = this.ids.map(id => ({ id, x: player.x, y: player.y }));
    player.companionSpeedBonus = this.ids.includes('butterfly') ? 0.15 : 0;
    player.companionShield = this.ids.includes('turtle') ? player.maxHp * 0.2 : 0;
  }

  update(dt: number, player: Player, vfx: VFXManager): void {
    this.elapsed += dt;
    if (this.ids.includes('frog')) {
      this.healTimer += dt;
      if (this.healTimer >= 5) {
        this.healTimer %= 5;
        const before = player.hp;
        if (before > 0) player.heal(player.maxHp * 0.02);
        const healed = player.hp - before;
        if (healed > 0) {
          vfx.addDamageNumber(player.x, player.y - 18, healed, false, true);
          vfx.addSparks(player.x, player.y, '#86efac', 5);
        }
      }
    }
    if (this.ids.includes('turtle')) {
      this.shieldTimer += dt;
      if (this.shieldTimer >= 20) {
        this.shieldTimer %= 20;
        player.companionShield = player.maxHp * 0.2;
        vfx.addSparks(player.x, player.y, '#67e8f9', 8);
      }
      player.companionShield = Math.min(player.companionShield, player.maxHp * 0.2);
    }
    this.positions.forEach((position, index) => {
      const angle = index * Math.PI * 2 / Math.max(1, this.positions.length) + 1.5;
      const targetX = player.x + Math.cos(angle) * 45;
      const targetY = player.y + Math.sin(angle) * 32 + 12;
      const factor = Math.hypot(position.x - player.x, position.y - player.y) > 250 ? 1 : Math.min(1, dt * 5);
      position.x += (targetX - position.x) * factor;
      position.y += (targetY - position.y) * factor;
    });
  }

  render(ctx: CanvasRenderingContext2D, camera: Camera, player: Player): void {
    ctx.save();
    if (player.companionShield > 0) {
      const p = camera.worldToScreen(player.x, player.y);
      ctx.strokeStyle = 'rgba(103, 232, 249, 0.8)';
      ctx.fillStyle = 'rgba(34, 211, 238, 0.08)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y - 10, 30 + Math.sin(this.elapsed * 3), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    this.positions.forEach(({ id, x, y }) => {
      const p = camera.worldToScreen(x, y);
      ctx.save(); ctx.translate(p.x, p.y);
      const ellipse = (cx: number, cy: number, rx: number, ry: number, color: string) => {
        ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      };
      ellipse(0, 5, 12, 4, 'rgba(0,0,0,0.25)');
      if (id === 'frog') {
        ctx.translate(0, -Math.abs(Math.sin(this.elapsed * 4)) * 5);
        ellipse(-9, 3, 5, 3, '#166534'); ellipse(9, 3, 5, 3, '#166534');
        ellipse(0, 0, 10, 8, '#4ade80'); ellipse(0, 2, 6, 4, '#bbf7d0');
        [-5, 5].forEach(ex => { ellipse(ex, -7, 4, 4, '#86efac'); ellipse(ex, -8, 2, 2, '#172554'); });
      } else if (id === 'turtle') {
        [-8, 8].forEach(ex => { ellipse(ex, -5, 4, 3, '#65a30d'); ellipse(ex, 5, 4, 3, '#65a30d'); });
        ellipse(0, -10, 4, 5, '#a3e635'); ellipse(0, 0, 10, 11, '#166534');
        ctx.strokeStyle = '#a3e635'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, -3); ctx.lineTo(5, 5); ctx.lineTo(0, 8); ctx.lineTo(-5, 5); ctx.lineTo(-6, -3); ctx.closePath(); ctx.stroke();
      } else {
        ctx.translate(0, -18 + Math.sin(this.elapsed * 5) * 4);
        const wing = 4 + Math.abs(Math.sin(this.elapsed * 12)) * 9;
        ellipse(-wing / 2, -4, wing, 8, '#38bdf8'); ellipse(wing / 2, -4, wing, 8, '#38bdf8');
        ellipse(-wing / 2, 5, wing * 0.7, 6, '#a78bfa'); ellipse(wing / 2, 5, wing * 0.7, 6, '#a78bfa');
        ellipse(0, 0, 2, 9, '#172554');
        ctx.strokeStyle = '#fef3c7'; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(-4, -13); ctx.moveTo(0, -7); ctx.lineTo(4, -13); ctx.stroke();
      }
      ctx.restore();
    });
    ctx.restore();
  }
}
