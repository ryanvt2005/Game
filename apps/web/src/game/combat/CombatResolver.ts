import type { Combatant, DamageEvent, StaggerComponent } from "./CombatTypes";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CombatEvents } from "./CombatEvents";

export class CombatResolver {
  readonly events = new CombatEvents();
  private tmpToSource?: Vector3;
  private tmpForward?: Vector3;

  applyDamage(target: Combatant, event: DamageEvent): void {
    if (target.isDead) return;

    let remainingDamage = event.amount;
    if (target.defense?.barrierActive && event.sourcePosition && target.getPosition && target.getForward) {
      if (!this.tmpToSource || !this.tmpForward) {
        this.tmpToSource = new Vector3();
        this.tmpForward = new Vector3();
      }
      this.tmpToSource.copyFrom(event.sourcePosition).subtractInPlace(target.getPosition());
      this.tmpToSource.y = 0;
      if (this.tmpToSource.lengthSquared() > 0.0001) {
        this.tmpToSource.normalize();
        this.tmpForward.copyFrom(target.getForward());
        this.tmpForward.y = 0;
        if (this.tmpForward.lengthSquared() > 0.0001) {
          this.tmpForward.normalize();
          const dot = this.tmpForward.dot(this.tmpToSource);
          if (dot > target.defense.frontalDotThreshold) {
            const reduced = remainingDamage * (1 - target.defense.reduction);
            remainingDamage = reduced;
            if (target.defense.shieldPoints > 0) {
              const absorbed = Math.min(target.defense.shieldPoints, remainingDamage);
              target.defense.shieldPoints -= absorbed;
              remainingDamage -= absorbed;
            }
          }
        }
      }
    }

    if (remainingDamage > 0) {
      target.health.currentHealth = Math.max(
        0,
        Math.min(target.health.maxHealth, target.health.currentHealth - remainingDamage)
      );
    }

    this.events.emitHit(event, target);

    if (target.stagger) {
      this.applyStagger(target, event.staggerAmount ?? event.amount);
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
