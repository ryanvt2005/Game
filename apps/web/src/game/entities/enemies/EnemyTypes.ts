import type { Color3 } from "@babylonjs/core/Maths/math.color";

export type EnemyArchetype = "grunt" | "bruiser" | "controller";

export type EnemyModifier = "hardened" | "volatile" | "adaptive";

export type EnemyConfig = {
  archetype: EnemyArchetype;
  maxHealth: number;
  staggerThreshold: number;
  speed: number;
  attackRange: number;
  attackCooldown: number;
  attackWindup: number;
  attackRecover: number;
  damage: number;
  stagger: number;
  color: Color3;
  attackType: "melee" | "pulse";
  slowMultiplier?: number;
  slowDuration?: number;
};
