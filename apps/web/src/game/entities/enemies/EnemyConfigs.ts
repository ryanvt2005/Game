import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { EnemyConfig } from "./EnemyTypes";

export const gruntConfig: EnemyConfig = {
  archetype: "grunt",
  maxHealth: 40,
  staggerThreshold: 16,
  speed: 3.2,
  attackRange: 1.6,
  attackCooldown: 1.0,
  attackWindup: 0.15,
  attackRecover: 0.3,
  damage: 6,
  stagger: 4,
  color: new Color3(0.7, 0.2, 0.2),
  attackType: "melee",
};

export const bruiserConfig: EnemyConfig = {
  archetype: "bruiser",
  maxHealth: 120,
  staggerThreshold: 40,
  speed: 2.1,
  attackRange: 2.2,
  attackCooldown: 2.2,
  attackWindup: 0.6,
  attackRecover: 0.6,
  damage: 16,
  stagger: 16,
  color: new Color3(0.5, 0.1, 0.1),
  attackType: "melee",
};

export const controllerConfig: EnemyConfig = {
  archetype: "controller",
  maxHealth: 60,
  staggerThreshold: 22,
  speed: 2.6,
  attackRange: 8,
  attackCooldown: 2.6,
  attackWindup: 0.3,
  attackRecover: 0.4,
  damage: 4,
  stagger: 6,
  color: new Color3(0.2, 0.6, 0.8),
  attackType: "pulse",
  slowMultiplier: 0.7,
  slowDuration: 1.6,
};
