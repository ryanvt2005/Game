import type { Combatant, DamageEvent, StaggerComponent } from "./CombatTypes";
import { CombatEvents } from "./CombatEvents";

export class CombatResolver {
  readonly events = new CombatEvents();

  applyDamage(target: Combatant, event: DamageEvent): void {
    if (target.isDead) return;

    target.health.currentHealth = Math.max(
      0,
      Math.min(target.health.maxHealth, target.health.currentHealth - event.amount)
    );

    this.events.emitHit(event, target);

    if (target.stagger) {
      this.applyStagger(target, event.amount);
    }

    if (target.health.currentHealth <= 0 && !target.isDead) {
      target.setDead();
      this.events.emitDeath(target);
    }
  }

  updateStagger(component: StaggerComponent, deltaSeconds: number): void {
    if (component.isStaggered) {
      component.staggerTimer = Math.max(0, component.staggerTimer - deltaSeconds);
      if (component.staggerTimer === 0) {
        component.isStaggered = false;
        component.cooldownTimer = component.cooldown;
        component.staggerValue = 0;
      }
      return;
    }

    if (component.cooldownTimer > 0) {
      component.cooldownTimer = Math.max(0, component.cooldownTimer - deltaSeconds);
    }
  }

  private applyStagger(target: Combatant, amount: number): void {
    if (!target.stagger) return;
    if (target.stagger.isStaggered || target.stagger.cooldownTimer > 0) return;

    target.stagger.staggerValue += amount;
    if (target.stagger.staggerValue >= target.stagger.staggerThreshold) {
      target.stagger.isStaggered = true;
      target.stagger.staggerTimer = target.stagger.staggerDuration;
      target.stagger.staggerValue = 0;
      this.events.emitStagger(target);
    }
  }
}
