import type { DamageType } from "../combat/CombatTypes";

export type AbilitySlot = "ability1" | "ability2" | "ability3" | "ultimate";

export type AbilityTargeting =
  | { type: "self" }
  | { type: "directional"; range: number };

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

export type ShieldEffect = {
  type: "shield";
  points: number;
  duration: number;
};

export type AbilityEffect = DamageEffect | DashEffect | ShieldEffect;

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
