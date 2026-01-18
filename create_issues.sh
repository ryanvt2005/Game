#!/usr/bin/env bash
set -euo pipefail

# =========================
# One-paste GitHub CLI script
# Creates labels, milestones, and the full issue backlog described earlier.
#
# Usage:
#   1) cd into your repo (or set REPO=owner/name)
#   2) bash ./create_issues.sh
#
# Optional:
#   REPO="owner/repo" bash ./create_issues.sh
# =========================

# Ensure gh is authenticated
gh auth status >/dev/null 2>&1 || { echo "ERROR: gh not authenticated. Run: gh auth login"; exit 1; }

REPO="${REPO:-$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)}"
if [[ -z "${REPO}" ]]; then
  echo "ERROR: Could not determine repo. Either cd into a git repo connected to GitHub, or set REPO=owner/repo"
  exit 1
fi

echo "Target repo: ${REPO}"

# ---------- Helpers ----------
ensure_label() {
  local name="$1"
  local color="$2"
  local desc="$3"
  # Create if missing; ignore error if already exists
  gh label create "$name" --repo "$REPO" --color "$color" --description "$desc" --force >/dev/null 2>&1 || true
}

create_milestone() {
  local title="$1"
  local description="$2"
  # Create milestone if it doesn't exist
  local existing
  existing="$(gh api -X GET "repos/${REPO}/milestones?state=all&per_page=100" --jq ".[] | select(.title==\"${title}\") | .number" 2>/dev/null || true)"
  if [[ -n "$existing" ]]; then
    echo "Milestone exists: ${title} (#${existing})" >&2
    echo "$title"
    return 0
  fi
  local number
  number="$(gh api -X POST "repos/${REPO}/milestones" -f title="$title" -f description="$description" --jq '.number')"
  echo "Created milestone: ${title} (#${number})" >&2
  echo "$title"
}

create_issue() {
  local title="$1"
  local body="$2"
  local labels_csv="$3"
  local milestone_title="${4:-}"

  # Skip if issue title already exists (simple idempotency)
  local found
  found="$(gh issue list --repo "$REPO" --search "$title in:title" --limit 50 --json title --jq ".[] | select(.title==\"${title}\") | .title" || true)"
  if [[ -n "$found" ]]; then
    echo "Skipping (already exists): $title"
    return 0
  fi

  if [[ -n "${milestone_title}" ]]; then
    gh issue create --repo "$REPO" --title "$title" --body "$body" --label "$labels_csv" --milestone "$milestone_title" >/dev/null
  else
    gh issue create --repo "$REPO" --title "$title" --body "$body" --label "$labels_csv" >/dev/null
  fi
  echo "Created issue: $title"
}

# ---------- Labels ----------
# Colors are arbitrary; adjust if you want.
ensure_label "docs"        "0E8A16" "Documentation changes"
ensure_label "foundation"  "5319E7" "Project foundation/setup"
ensure_label "tech"        "1D76DB" "Engineering task"
ensure_label "feature"     "FBCA04" "Gameplay/design feature"
ensure_label "bug"         "D73A4A" "Something isn't working"
ensure_label "core-gameplay" "0052CC" "Camera/movement/game feel"
ensure_label "combat"      "B60205" "Combat and abilities"
ensure_label "architecture" "C2E0C6" "System architecture"
ensure_label "hero"        "A2EEEF" "Playable hero work"
ensure_label "enemy"       "F9D0C4" "Enemy work"
ensure_label "boss"        "8B4513" "Boss encounter work"
ensure_label "missions"    "006B75" "Mission/objective systems"
ensure_label "story"       "7057FF" "Narrative/story implementation"
ensure_label "performance" "0B1F33" "Performance and optimization"
ensure_label "polish"      "FFD1DC" "VFX/audio/feel polish"

# ---------- Milestones ----------
MS_CORE_FEEL="$(create_milestone "MVP – Core Feel" "Camera + movement + basic combat feel. Must be fun before content.")"
MS_FIRST_HERO="$(create_milestone "MVP – First Hero" "Ability framework + one fully playable hero + basic HUD.")"
MS_ACT1_SLICE="$(create_milestone "MVP – Act I Vertical Slice" "Act I missions, enemies, bosses, progression, and a demo-ready build.")"

# ---------- Issues ----------

# EPIC 0 — Project Foundation
create_issue \
"[DOCS] Establish core game documentation baseline" \
"## Goal
Ensure all foundational game documentation exists, is committed, and cross-referenced.

## Scope
**In-scope:**
- Docs under \`/docs/01-vision\`
- Docs under \`/docs/02-narrative\`
- Docs under \`/docs/03-design\`
- Docs under \`/docs/04-technical\`
- MVP roadmap

**Out-of-scope:**
- Code changes
- Asset creation

## Acceptance Criteria
- [ ] All docs exist in repo
- [ ] README links to key docs
- [ ] Folder structure matches agreed layout
" \
"docs,foundation" \
"$MS_CORE_FEEL"

# EPIC 1 — Core Gameplay Systems
create_issue \
"[TECH] Implement third-person camera with collision avoidance" \
"## Goal
Create a responsive third-person camera suitable for superhero movement and combat.

## Requirements
- Follow player smoothly with configurable offset
- Collision avoidance with environment
- Adjustable FOV for sprint/dash
- Supports lock-on targets

## Acceptance Criteria
- [ ] Camera never clips through geometry
- [ ] Camera transitions are smooth
- [ ] Works across all test arenas

## Implementation Notes
- Babylon.js ArcRotateCamera or custom follow camera
- Expose tunables via config
" \
"tech,core-gameplay" \
"$MS_CORE_FEEL"

create_issue \
"[TECH] Implement player movement (run, jump, dash)" \
"## Goal
Implement foundational superhero movement.

## Requirements
- Run with acceleration/deceleration
- Jump with air control
- Dash with cooldown
- Supports hero-specific modifiers later

## Acceptance Criteria
- [ ] Movement feels responsive
- [ ] Dash cancels into abilities
- [ ] No physics jitter or tunneling
" \
"tech,core-gameplay" \
"$MS_CORE_FEEL"

create_issue \
"[TECH] Implement core combat system (damage, stagger, hit reactions)" \
"## Goal
Create the base combat resolution system used by all entities.

## Requirements
- Health + energy system
- Damage types (Physical, Energy, Fracture)
- Stagger mechanics
- Hit reactions and invulnerability windows

## Acceptance Criteria
- [ ] Enemies react correctly to hits
- [ ] Stagger interrupts valid actions
- [ ] System is data-driven
" \
"tech,combat" \
"$MS_CORE_FEEL"

create_issue \
"[TECH] Implement data-driven ability system" \
"## Goal
Enable heroes and enemies to use configurable abilities.

## Requirements
- Cooldowns
- Energy cost
- Targeting modes
- VFX + SFX hooks
- Ultimate charge tracking

## Acceptance Criteria
- [ ] Abilities defined via config
- [ ] Cooldowns enforced
- [ ] Ultimate abilities charge and fire correctly
" \
"tech,combat,architecture" \
"$MS_FIRST_HERO"

# EPIC 2 — Playable Heroes
create_issue \
"[FEAT] Implement playable hero: Aegis Vector" \
"## Hero Summary
Tech defender with directional energy planes.

## Requirements
- Basic attack
- Ability 1: Directional energy barrier
- Ability 2: Energy plane strike
- Ability 3: Tactical reposition
- Ultimate: Overcharged defense mode

## Acceptance Criteria
- [ ] All abilities functional
- [ ] Abilities respect cooldown/energy
- [ ] Visual clarity and readability
" \
"feature,hero" \
"$MS_FIRST_HERO"

create_issue \
"[FEAT] Implement playable hero: Riftcaller" \
"## Hero Summary
Energy manipulator with unstable power chaining.

## Requirements
- Blink-style movement
- Fracture bolt chaining logic
- Area distortion ultimate

## Acceptance Criteria
- [ ] Ability chaining behaves consistently
- [ ] Instability effects visible
- [ ] Hero feels distinct from others
" \
"feature,hero" \
"$MS_ACT1_SLICE"

create_issue \
"[FEAT] Implement playable hero: Kinetic Saint" \
"## Hero Summary
Momentum-based brawler.

## Requirements
- Dash chaining
- Momentum-scaled damage
- Ground shock abilities

## Acceptance Criteria
- [ ] Speed impacts damage
- [ ] Combat rewards aggressive movement
- [ ] Hero viable in all missions
" \
"feature,hero" \
"$MS_ACT1_SLICE"

# EPIC 3 — Enemies & Bosses
create_issue \
"[TECH] Implement standard enemy archetypes" \
"## Requirements
Implement the following archetypes (per docs/03-design/enemy-design.md):
- Grunt
- Bruiser
- Controller
- Elite variants

## Acceptance Criteria
- [ ] Enemies coordinate in groups
- [ ] Difficulty scales via composition (not inflated HP)
- [ ] Shared AI framework supports modifiers (Fractured/Hardened/Volatile/Adaptive)
" \
"tech,enemy" \
"$MS_ACT1_SLICE"

create_issue \
"[FEAT] Implement Vanguard hero enforcer enemies" \
"## Requirements
- Shield usage (directional barriers)
- Suppression abilities (energy drain/cooldown pressure)
- Coordinated tactics (formation/priority targets)

## Acceptance Criteria
- [ ] Enemies feel tactical and disciplined
- [ ] Punish careless ability spam
- [ ] Readable telegraphs for suppression and shields
" \
"feature,enemy" \
"$MS_ACT1_SLICE"

create_issue \
"[FEAT] Implement corrupted hero boss framework" \
"## Goal
Create a reusable corrupted-hero boss system (multi-phase, player-like abilities).

## Requirements
- Multi-phase behavior (Controlled → Unstable → Overload)
- Uses the same ability framework as player
- Instability escalation mechanics
- Combat dialogue hooks (events at phase changes, near defeat)

## Acceptance Criteria
- [ ] Boss phases trigger correctly
- [ ] Boss adapts to player behavior (anti-spam)
- [ ] Fight feels cinematic and readable
" \
"feature,boss" \
"$MS_ACT1_SLICE"

# EPIC 4 — Missions & Story
create_issue \
"[TECH] Implement mission structure and objective system" \
"## Goal
Implement the mission framework described in docs/03-design/mission-structure.md.

## Requirements
- Modular objectives (defeat, disable, hold, escort, escape)
- Success/failure states
- Optional objectives
- Mission events (briefing/deployment/escalation/climax/resolution)
- Hooks for dialogue + reputation impacts

## Acceptance Criteria
- [ ] Missions reusable across zones
- [ ] Clear objective feedback in HUD
- [ ] Optional objectives grant rewards and/or reputation changes
" \
"tech,missions" \
"$MS_ACT1_SLICE"

create_issue \
"[FEAT] Implement Act I story missions" \
"## Goal
Implement Missions 1–6 from docs/02-narrative/act-1-outline.md.

## Requirements
- Mission scripting/triggers for each mission beat
- Dialogue/event triggers tied to key moments
- Reputation hooks (Order↔Freedom, Control↔Evolution)

## Acceptance Criteria
- [ ] All Act I missions playable end-to-end
- [ ] Story beats trigger correctly
- [ ] Reputation values update and persist
" \
"feature,story" \
"$MS_ACT1_SLICE"

# EPIC 5 — Performance & Polish
create_issue \
"[TECH] Enforce web performance budgets" \
"## Goal
Apply and enforce the budgets in docs/04-technical/performance-budget.md.

## Requirements
- Asset budget checks (documented + enforced in pipeline or runtime logging)
- Object pooling (projectiles/VFX/enemies)
- Scene cleanup/disposal on exit
- Avoid unbounded allocations in hot loops

## Acceptance Criteria
- [ ] Stable FPS in test arena (target 60)
- [ ] No memory leaks across scene reloads
- [ ] Scene transitions under 3 seconds (target)
" \
"tech,performance" \
"$MS_ACT1_SLICE"

create_issue \
"[FEAT] Add VFX and audio polish to combat" \
"## Goal
Improve combat feel with readable, performant VFX and SFX.

## Requirements
- Ability VFX for each hero
- Hit impacts (sparks/flash/knockback cues)
- Subtle camera shake on heavy hits
- Basic SFX set (whoosh/hit/charge/explosion)

## Acceptance Criteria
- [ ] Combat feels impactful and responsive
- [ ] Effects remain readable (not noisy)
- [ ] No significant FPS regressions
" \
"feature,polish" \
"$MS_ACT1_SLICE"

echo "✅ Done. Labels, milestones, and issues have been created in ${REPO}."
