import type { Vector3 } from "@babylonjs/core/Maths/math.vector";

export type DamageType = "physical" | "energy" | "fracture";

export type DamageEvent = {
  amount: number;
  type: DamageType;
  sourceId: string;
  targetId: string;
  hitPoint: Vector3 | null;
  timestamp: number;
};

export type HealthComponent = {
  maxHealth: number;
  currentHealth: number;
};

export type EnergyComponent = {
  maxEnergy: number;
  currentEnergy: number;
  regenRate: number;
};

export type StaggerComponent = {
  staggerThreshold: number;
  staggerValue: number;
  isStaggered: boolean;
  staggerDuration: number;
  staggerTimer: number;
  cooldown: number;
  cooldownTimer: number;
};

export type Combatant = {
  id: string;
  health: HealthComponent;
  energy?: EnergyComponent;
  stagger?: StaggerComponent;
  isDead: boolean;
  setDead: () => void;
};
