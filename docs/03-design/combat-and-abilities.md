# Combat and Abilities Design

## Design Goals
- Combat should feel powerful, readable, and responsive.
- Abilities must be distinct per hero while sharing a common system.
- Encounters must support hero-vs-hero combat without special-case logic.
- Systems must be deterministic and debuggable (important for web performance).

---

## Core Combat Loop
1. Player engages enemies using movement + basic attacks
2. Abilities are used tactically (cooldowns + energy)
3. Enemies react with stagger, shields, or counter-abilities
4. Player manages positioning, resources, and threat
5. Encounter escalates (reinforcements, phase change, hero interference)

---

## Player Combat Systems

### Health
- Fixed max health per hero (modifiable via upgrades)
- Damage types:
  - Physical
  - Energy
  - Fracture (ignores some defenses)

### Energy (Ability Resource)
- Shared across all abilities
- Regenerates over time
- Can be overdrawn in emergency situations (temporary penalties apply)

### Stagger / Impact
- Certain attacks apply stagger instead of damage
- Hero enemies can be interrupted if staggered at key moments
- Bosses have stagger thresholds, not instant interrupts

---

## Ability Framework (All Heroes)

Each hero has:
- **Basic Attack** (no cooldown)
- **Ability 1** (low cooldown)
- **Ability 2** (medium cooldown)
- **Ability 3** (utility / control)
- **Ultimate Ability** (charge-based)

### Ability Properties
Every ability is defined by:
- Cooldown (seconds)
- Energy cost
- Damage type
- Targeting type:
  - Self
  - Directional
  - Area
  - Lock-on
- Status effects (optional)
- Visual FX hook
- Audio FX hook

Abilities are data-driven (JSON / TS config), not hardcoded.

---

## Ultimate Abilities
- Charged via:
  - Damage dealt
  - Damage taken
  - Objective progress
- Cannot be spammed
- Designed to shift the state of a fight (not instant win)

---

## Hero vs Hero Combat Rules
- Hero enemies use the same ability system as the player
- Cooldowns and energy apply equally
- AI heroes:
  - Read player behavior
  - Adapt ability usage
  - Enter unstable phases under stress

---

## Status Effects (MVP)
- Stagger
- Slow
- Energy Drain
- Shielded
- Unstable (Fracture-specific; unpredictable behavior)

---

## Difficulty Scaling
- Enemy health does not scale excessively
- Difficulty increases via:
  - Ability frequency
  - Enemy coordination
  - Environmental pressure
  - Hero corruption phases

---

## Accessibility Considerations
- Optional aim assist
- Clear telegraphs for hero abilities
- Colorblind-friendly VFX palettes (planned)
