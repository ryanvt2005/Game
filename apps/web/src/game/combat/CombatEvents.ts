import type { Combatant, DamageEvent } from "./CombatTypes";

type HitListener = (_event: DamageEvent, _target: Combatant) => void;
type StaggerListener = (_target: Combatant) => void;
type DeathListener = (_target: Combatant) => void;

export class CombatEvents {
  private readonly hitListeners = new Set<HitListener>();
  private readonly staggerListeners = new Set<StaggerListener>();
  private readonly deathListeners = new Set<DeathListener>();

  onHit(listener: HitListener): () => void {
    this.hitListeners.add(listener);
    return () => this.hitListeners.delete(listener);
  }

  onStagger(listener: StaggerListener): () => void {
    this.staggerListeners.add(listener);
    return () => this.staggerListeners.delete(listener);
  }

  onDeath(listener: DeathListener): () => void {
    this.deathListeners.add(listener);
    return () => this.deathListeners.delete(listener);
  }

  emitHit(event: DamageEvent, target: Combatant): void {
    for (const listener of this.hitListeners) {
      listener(event, target);
    }
  }

  emitStagger(target: Combatant): void {
    for (const listener of this.staggerListeners) {
      listener(target);
    }
  }

  emitDeath(target: Combatant): void {
    for (const listener of this.deathListeners) {
      listener(target);
    }
  }
}
