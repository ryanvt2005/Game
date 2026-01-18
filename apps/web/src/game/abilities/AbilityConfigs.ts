import type { AbilityConfig, AbilityLoadout } from "./AbilityTypes";

const basicTap: AbilityConfig = {
  id: "aegis_basic",
  name: "Vector Tap",
  description: "Quick tap shot.",
  slot: "basic",
  cooldownSeconds: 0,
  energyCost: 0,
  tags: ["damage"],
  targeting: { type: "directional", range: 2.6, width: 1.2 },
  effects: [
    {
      type: "damage",
      amount: 6,
      damageType: "physical",
      staggerAmount: 4,
    },
  ],
  vfxKey: "basic_tap",
  sfxKey: "basic_tap",
};

const directionalBarrier: AbilityConfig = {
  id: "aegis_barrier",
  name: "Directional Barrier",
  description: "Deploys a forward shield plane.",
  slot: "ability1",
  cooldownSeconds: 8,
  energyCost: 18,
  tags: ["defense"],
  targeting: { type: "self" },
  effects: [
    {
      type: "barrier",
      duration: 6,
      frontalDotThreshold: 0.35,
      reduction: 0.6,
      shieldPoints: 40,
    },
  ],
  vfxKey: "barrier_plane",
  sfxKey: "barrier_plane",
};

const planeStrike: AbilityConfig = {
  id: "aegis_plane_strike",
  name: "Energy Plane Strike",
  description: "A sweeping energy plane attack.",
  slot: "ability2",
  cooldownSeconds: 4,
  energyCost: 16,
  tags: ["damage"],
  targeting: { type: "directional", range: 9, width: 4.2 },
  effects: [
    {
      type: "damage",
      amount: 20,
      damageType: "energy",
      staggerAmount: 22,
    },
  ],
  vfxKey: "plane_strike",
  sfxKey: "plane_strike",
};

const tacticalReposition: AbilityConfig = {
  id: "aegis_reposition",
  name: "Tactical Reposition",
  description: "Quick lateral reposition.",
  slot: "ability3",
  cooldownSeconds: 3,
  energyCost: 10,
  tags: ["movement"],
  targeting: { type: "self" },
  effects: [
    {
      type: "impulse",
      speed: 12,
      duration: 0.18,
      direction: "left",
    },
  ],
  vfxKey: "tactical_reposition",
  sfxKey: "tactical_reposition",
};

const overchargeMode: AbilityConfig = {
  id: "aegis_overcharge",
  name: "Overcharge Mode",
  description: "Temporarily boosts offense and defense.",
  slot: "ultimate",
  cooldownSeconds: 18,
  energyCost: 0,
  tags: ["ultimate"],
  targeting: { type: "self" },
  effects: [
    {
      type: "overcharge",
      duration: 10,
      damageMultiplier: 1.4,
      staggerMultiplier: 1.5,
      barrierBonus: 0.15,
      shieldBonus: 20,
    },
  ],
  vfxKey: "overcharge",
  sfxKey: "overcharge",
};

export const abilityConfigs: AbilityConfig[] = [
  basicTap,
  directionalBarrier,
  planeStrike,
  tacticalReposition,
  overchargeMode,
];

export const playerLoadout: AbilityLoadout = {
  basic: basicTap,
  ability1: directionalBarrier,
  ability2: planeStrike,
  ability3: tacticalReposition,
  ultimate: overchargeMode,
};
