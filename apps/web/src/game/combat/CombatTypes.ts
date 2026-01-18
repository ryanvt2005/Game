import type { Vector3 } from "@babylonjs/core/Maths/math.vector";

export type DamageType = "physical" | "energy" | "fracture";

export type DamageEvent = {
  amount: number;
  type: DamageType;
  sourceId: string;
  targetId: string;
  hitPoint: Vector3 | null;
  timestamp: number;
  staggerAmount?: number;
  sourcePosition?: Vector3;
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

export type DefenseComponent = {
  barrierActive: boolean;
  barrierTimer: number;
  frontalDotThreshold: number;
  reduction: number;
  shieldPoints: number;
};

export type Combatant = {
  id: string;
  health: HealthComponent;
  energy?: EnergyComponent;
  stagger?: StaggerComponent;
  defense?: DefenseComponent;
  isDead: boolean;
  setDead: () => void;
  getPosition?: () => Vector3;
  getForward?: () => Vector3;
};
