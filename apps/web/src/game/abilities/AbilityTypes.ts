import type { DamageType } from "../combat/CombatTypes";

export type AbilitySlot = "basic" | "ability1" | "ability2" | "ability3" | "ultimate";

export type AbilityTargeting =
  | { type: "self" }
  | { type: "directional"; range: number; width?: number };

export type DamageEffect = {
  type: "damage";
  amount: number;
  damageType: DamageType;
  staggerAmount?: number;
};

export type DashEffect = {
  type: "dash";
  speed: number;
  duration: number;
};

export type ImpulseEffect = {
  type: "impulse";
  speed: number;
  duration: number;
  direction: "forward" | "back" | "left" | "right";
};

export type ShieldEffect = {
  type: "shield";
  points: number;
  duration: number;
};

export type BarrierEffect = {
  type: "barrier";
  duration: number;
  frontalDotThreshold: number;
  reduction: number;
  shieldPoints: number;
};

export type OverchargeEffect = {
  type: "overcharge";
  duration: number;
  damageMultiplier: number;
  staggerMultiplier: number;
  barrierBonus: number;
  shieldBonus: number;
};

export type AbilityEffect =
  | DamageEffect
  | DashEffect
  | ImpulseEffect
  | ShieldEffect
  | BarrierEffect
  | OverchargeEffect;

export type AbilityConfig = {
  id: string;
  name: string;
  description?: string;
  slot: AbilitySlot;
  cooldownSeconds: number;
  energyCost: number;
  tags: string[];
  targeting: AbilityTargeting;
  effects: AbilityEffect[];
  vfxKey?: string;
  sfxKey?: string;
};

export type AbilityRuntime = {
  cooldownRemaining: number;
  lastCastTime: number;
};

export type AbilityLoadout = {
  [slot in AbilitySlot]?: AbilityConfig;
};
