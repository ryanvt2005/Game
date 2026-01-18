import type { Scene } from "@babylonjs/core/scene";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Ray } from "@babylonjs/core/Culling/ray";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { AbilityConfig, AbilityLoadout, AbilityRuntime, AbilitySlot, AbilityEffect } from "./AbilityTypes";
import type { CombatResolver } from "../combat/CombatResolver";
import type { DamageEvent } from "../combat/CombatTypes";
import type { TestDummy } from "../entities/TestDummy";
import type { ThirdPersonCamera } from "../systems/ThirdPersonCamera";
import type { PlayerMovementSystem } from "../systems/PlayerMovementSystem";

type AbilityUser = {
  id: string;
  mesh: AbstractMesh;
  energy: { max: number; current: number; regenRate: number };
  getShieldPoints: () => number;
  setShieldPoints: (points: number) => void;
  movement: PlayerMovementSystem;
};

export class AbilitySystem {
  private readonly scene: Scene;
  private readonly camera: ThirdPersonCamera;
  private readonly combatResolver: CombatResolver;
  private readonly user: AbilityUser;
  private readonly loadout: AbilityLoadout;
  private readonly dummyByMesh: Map<AbstractMesh, TestDummy>;
  private readonly runtimeById = new Map<string, AbilityRuntime>();
  private readonly abilityRay = new Ray(Vector3.Zero(), Vector3.Forward(), 1);
  private readonly rayOrigin = new Vector3();
  private readonly rayDirection = new Vector3();
  private readonly impulseDirection = new Vector3();
  private fovTimer = 0;
  private shieldTimer = 0;
  private shieldAmount = 0;

  constructor(
    scene: Scene,
    camera: ThirdPersonCamera,
    combatResolver: CombatResolver,
    user: AbilityUser,
    loadout: AbilityLoadout,
    dummyByMesh: Map<AbstractMesh, TestDummy>
  ) {
    this.scene = scene;
    this.camera = camera;
    this.combatResolver = combatResolver;
    this.user = user;
    this.loadout = loadout;
    this.dummyByMesh = dummyByMesh;

    for (const ability of Object.values(loadout)) {
      if (!ability) continue;
      this.runtimeById.set(ability.id, { cooldownRemaining: 0, lastCastTime: 0 });
    }
  }

  update(deltaSeconds: number): void {
    for (const runtime of this.runtimeById.values()) {
      if (runtime.cooldownRemaining > 0) {
        runtime.cooldownRemaining = Math.max(0, runtime.cooldownRemaining - deltaSeconds);
      }
    }

    if (this.user.energy.current < this.user.energy.max) {
      this.user.energy.current = Math.min(
        this.user.energy.max,
        this.user.energy.current + this.user.energy.regenRate * deltaSeconds
      );
    }

    if (this.fovTimer > 0) {
      this.fovTimer = Math.max(0, this.fovTimer - deltaSeconds);
      if (this.fovTimer === 0) {
        this.camera.setFovMode("normal");
      }
    }

    if (this.shieldTimer > 0) {
      this.shieldTimer = Math.max(0, this.shieldTimer - deltaSeconds);
      if (this.shieldTimer === 0) {
        this.user.setShieldPoints(0);
        this.shieldAmount = 0;
      }
    }
  }

  tryCast(slot: AbilitySlot): void {
    const ability = this.loadout[slot];
    if (!ability) return;

    const runtime = this.runtimeById.get(ability.id);
    if (!runtime) return;
    if (runtime.cooldownRemaining > 0) return;
    if (this.user.energy.current < ability.energyCost) return;

    const target = this.resolveTarget(ability);
    if (!target && ability.targeting.type === "directional") return;

    this.user.energy.current = Math.max(0, this.user.energy.current - ability.energyCost);
    runtime.cooldownRemaining = ability.cooldownSeconds;
    runtime.lastCastTime = performance.now();

    for (const effect of ability.effects) {
      this.applyEffect(effect, ability, target);
    }
  }

  private resolveTarget(ability: AbilityConfig): TestDummy | null {
    if (ability.targeting.type === "self") return null;

    const range = ability.targeting.range;
    const camera = this.scene.activeCamera;
    if (!camera) return null;

    this.rayOrigin.copyFrom(camera.globalPosition);
    this.rayDirection.copyFrom(camera.getForwardRay(1).direction);
    this.abilityRay.origin.copyFrom(this.rayOrigin);
    this.abilityRay.direction.copyFrom(this.rayDirection);
    this.abilityRay.length = range;

    const hit = this.scene.pickWithRay(this.abilityRay, (mesh) => this.dummyByMesh.has(mesh));
    if (!hit?.hit || !hit.pickedMesh) return null;
    return this.dummyByMesh.get(hit.pickedMesh) ?? null;
  }

  private applyEffect(effect: AbilityEffect, ability: AbilityConfig, target: TestDummy | null): void {
    switch (effect.type) {
      case "damage": {
        if (!target) return;
        const event: DamageEvent = {
          amount: effect.amount,
          type: effect.damageType,
          sourceId: this.user.id,
          targetId: target.getCombatant().id,
          hitPoint: null,
          timestamp: performance.now(),
          staggerAmount: effect.staggerAmount,
        };
        this.combatResolver.applyDamage(target.getCombatant(), event);
        break;
      }
      case "dash": {
        this.camera.getPlanarForward(this.impulseDirection);
        this.user.movement.applyImpulse(this.impulseDirection, effect.speed, effect.duration);
        this.camera.setFovMode("dash");
        this.fovTimer = Math.max(this.fovTimer, effect.duration);
        break;
      }
      case "shield": {
        this.shieldAmount = Math.max(this.shieldAmount, effect.points);
        this.user.setShieldPoints(this.shieldAmount);
        this.shieldTimer = Math.max(this.shieldTimer, effect.duration);
        break;
      }
      default:
        break;
    }
  }
}
