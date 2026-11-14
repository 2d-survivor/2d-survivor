// Kopenawa is the cave guardian turned into an active arena boss. His arena
// reuses the gorilla plateau's diameter so the fight keeps the same footprint.
export const KOPENAWAS = {
  triggerRadius: 300,
  arenaRadius: 600,
  hp: 6500,
  speed: 94,
  damage: 24,
  radius: 24,
  xpValue: 600,
  // The old sage attacks three times faster than his original rhythm.
  attackSpeedMultiplier: 3,
  // His smoke illusions inherit 50% of every combat stat and ability.
  cloneStatMultiplier: 0.5,
  breath: {
    // Stored before the attack-speed multiplier: 13.5 / 3 = 4.5 s effective.
    cooldown: 13.5,
    warning: 0.7,
    duration: 0.9,
    range: 460,
    halfAngle: Math.PI / 7,
    damageMultiplier: 20 / 24,
    transeDuration: 1.5,
  },
  spiritBolt: {
    initialCooldown: 2.4,
    // Stored before the attack-speed multiplier: 10.5 / 3 = 3.5 s effective.
    cooldown: 10.5,
    speed: 265,
    radius: 12,
    life: 4.5,
    damageMultiplier: 16 / 24,
    confusionDuration: 2,
  },
  smoke: {
    threshold: 0.5,
    invulnerable: 1,
    cloneCount: 2,
    cloneRadius: 20,
  },
  entrance: {
    slamWindup: 0.6,
    slamRecovery: 0.35,
  },
} as const;
