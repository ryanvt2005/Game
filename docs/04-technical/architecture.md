# Technical Architecture

## High-Level Overview

The game is split into two primary layers:
1. **Application Layer (React)**
2. **Game Layer (Babylon.js)**

They communicate via a thin interface but remain decoupled.

---

## Application Layer (React)
Responsibilities:
- Routing (Home, Hero Select, Campaign, Settings)
- Menus and UI
- Save/load profile data
- Settings and accessibility options

Tech:
- React 18
- Vite
- Tailwind CSS (planned)

React does NOT control gameplay logic.

---

## Game Layer (Babylon.js)
Responsibilities:
- Scene creation and lifecycle
- Input handling
- Entity management
- Combat resolution
- AI behavior
- Physics and collisions
- Rendering, lighting, VFX

---

## Scene Lifecycle

1. React route mounts `<GameCanvas />`
2. Babylon Engine initializes
3. Scene loads:
   - Assets
   - Player hero
   - Enemies
   - Mission logic
4. Game loop runs
5. Scene signals completion/failure
6. React handles transition (results, retry, next mission)

---

## Core Game Objects

### Game
- Owns Babylon Engine
- Manages active Scene
- Handles pause/resume

### Scene
- Owns:
  - Entities
  - Systems
  - Environment
- Emits events:
  - missionComplete
  - missionFailed
  - playerDeath

### Entity
- Player
- Enemy
- Hero Enemy
- Projectile
- Environmental Hazard

Entities have:
- Transform
- Health/Energy
- Ability loadout
- State machine

---

## Systems Architecture

Systems run each frame:
- InputSystem
- MovementSystem
- CombatSystem
- AbilitySystem
- AISystem
- VFXSystem
- AudioSystem

Systems operate on entities via composition, not inheritance.

---

## Data-Driven Design

Defined via config:
- Hero stats
- Ability definitions
- Enemy variants
- Boss phases
- Difficulty modifiers

Goal: allow tuning without code changes.

---

## Save Data (MVP)
Stored locally (later server-side):
- Selected hero
- Mission progress
- Reputation values
- Unlocked abilities/upgrades

---

## Performance Budget (Web)
- Target: 60 FPS on mid-range desktop
- Single active scene
- Limited dynamic lights
- Reuse meshes and materials
- Object pooling for:
  - Projectiles
  - VFX
  - Enemies

---

## Future-Proofing (Not MVP)
- Multiplayer hooks (event-based)
- Server authority
- Live content updates
