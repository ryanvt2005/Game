import type { AbilityConfig, AbilityLoadout } from "./AbilityTypes";

const pulseShot: AbilityConfig = {
  id: "pulse_shot",
  name: "Pulse Shot",
  description: "Directional energy pulse.",
  slot: "ability1",
  cooldownSeconds: 1.0,
  energyCost: 10,
  tags: ["damage"],
  targeting: { type: "directional", range: 14 },
  effects: [
    {
      type: "damage",
      amount: 12,
      damageType: "energy",
      staggerAmount: 12,
    },
  ],
  vfxKey: "pulse_shot",
  sfxKey: "pulse_shot",
};

const burstDash: AbilityConfig = {
  id: "burst_dash",
  name: "Burst Dash",
  description: "Short forward burst.",
  slot: "ability2",
  cooldownSeconds: 2.5,
  energyCost: 8,
  tags: ["movement"],
  targeting: { type: "self" },
  effects: [
    {
      type: "dash",
      speed: 16,
      duration: 0.22,
    },
  ],
  vfxKey: "burst_dash",
  sfxKey: "burst_dash",
};

export const abilityConfigs: AbilityConfig[] = [pulseShot, burstDash];

export const playerLoadout: AbilityLoadout = {
  ability1: pulseShot,
  ability2: burstDash,
};
