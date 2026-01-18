# Performance Budget (Web)

## Performance Targets
- 60 FPS on mid-range desktop
- Acceptable fallback at 30 FPS
- Load time < 10 seconds on first play
- Scene transitions < 3 seconds

---

## Rendering Budget

### Geometry
- Player hero: 25k–40k triangles
- Standard enemies: 10k–20k triangles
- Bosses: up to 60k triangles
- Environment per scene: ≤ 500k triangles

### Materials
- Max 2–3 materials per character
- Shared materials whenever possible
- Avoid per-frame material creation

---

## Lighting
- Max 1 dynamic directional light
- Max 4 dynamic point/spot lights
- Prefer baked lighting where possible
- Shadows limited to:
  - Player
  - Bosses
  - Key enemies

---

## Textures
- Use compressed formats (Basis/KTX2)
- Texture resolution caps:
  - Characters: 2K max
  - Environment: 1K–2K
- Limit unique textures per scene

---

## VFX Budget
- Particle systems pooled and reused
- Cap concurrent particle systems
- Screen-space effects used sparingly
- Avoid full-screen post-processing chains

---

## CPU Budget
- AI updates staggered (not all per frame)
- Pathfinding limited to small areas
- Physics simplified for most enemies

---

## Memory Management
- One active scene at a time
- Explicit asset disposal on scene exit
- Avoid anonymous closures in hot loops

---

## Profiling & Testing
- Profile early and often
- Test on:
  - Mid-range desktop
  - Low-end laptop
- Performance regressions block release

---

## Non-Negotiables
- No unbounded object creation
- No blocking operations on main thread
- No uncompressed textures in production
