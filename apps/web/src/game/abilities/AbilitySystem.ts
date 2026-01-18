import type { Scene } from "@babylonjs/core/scene";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Ray } from "@babylonjs/core/Culling/ray";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
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
  applyBarrier: (duration: number, reduction: number, shieldPoints: number, frontalDot: number) => void;
  updateDefense: (deltaSeconds: number) => void;
  isBarrierActive: () => boolean;
  setOverchargeVisual: (active: boolean) => void;
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
  private readonly tmpToTarget = new Vector3();
  private readonly tmpPerp = new Vector3();
  private readonly tmpDirectionScaled = new Vector3();
  private fovTimer = 0;
  private overchargeTimer = 0;
  private damageMultiplier = 1;
  private staggerMultiplier = 1;
  private barrierBonus = 0;
  private shieldBonus = 0;
  private ultimateCharge = 0;
  private readonly barrierMesh: AbstractMesh;
  private readonly barrierMaterial: StandardMaterial;
  private readonly planeMaterial: StandardMaterial;
  private readonly planeVfx: { mesh: AbstractMesh; velocity: Vector3; remaining: number }[] = [];
  private readonly vfxStep = new Vector3();

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

    this.barrierMesh = MeshBuilder.CreateBox(
      "barrier_mesh",
      { width: 2.6, height: 2.2, depth: 0.12 },
      scene
    );
    this.barrierMesh.isPickable = false;
    this.barrierMesh.setParent(user.mesh);
    this.barrierMesh.position.set(0, 1.1, 1.3);
    this.barrierMaterial = new StandardMaterial("barrier_mat", scene);
    this.barrierMaterial.diffuseColor = new Color3(0.2, 0.8, 1);
    this.barrierMaterial.emissiveColor = new Color3(0.2, 0.8, 1);
    this.barrierMaterial.alpha = 0.6;
    this.barrierMesh.material = this.barrierMaterial;
    this.barrierMesh.setEnabled(false);

    this.planeMaterial = new StandardMaterial("plane_strike_mat", scene);
    this.planeMaterial.diffuseColor = new Color3(0.1, 0.9, 1);
    this.planeMaterial.emissiveColor = new Color3(0.1, 0.9, 1);
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

    if (this.overchargeTimer > 0) {
      this.overchargeTimer = Math.max(0, this.overchargeTimer - deltaSeconds);
      if (this.overchargeTimer === 0) {
        this.damageMultiplier = 1;
        this.staggerMultiplier = 1;
        this.barrierBonus = 0;
        this.shieldBonus = 0;
        this.user.setOverchargeVisual(false);
      }
    }

    this.user.updateDefense(deltaSeconds);
    this.barrierMesh.setEnabled(this.user.isBarrierActive());

    if (this.ultimateCharge < 1) {
      this.ultimateCharge = Math.min(1, this.ultimateCharge + 0.02 * deltaSeconds);
    }

    for (let i = this.planeVfx.length - 1; i >= 0; i -= 1) {
      const vfx = this.planeVfx[i];
      vfx.remaining -= deltaSeconds;
      vfx.velocity.scaleToRef(deltaSeconds, this.vfxStep);
      vfx.mesh.position.addInPlace(this.vfxStep);
      if (vfx.remaining <= 0) {
        vfx.mesh.dispose();
        this.planeVfx.splice(i, 1);
      }
    }
  }

  getEnergy(): { current: number; max: number } {
    return { current: this.user.energy.current, max: this.user.energy.max };
  }

  isBarrierActive(): boolean {
    return this.user.isBarrierActive();
  }

  tryCast(slot: AbilitySlot): void {
    const ability = this.loadout[slot];
    if (!ability) return;

    const runtime = this.runtimeById.get(ability.id);
    if (!runtime) return;
    if (runtime.cooldownRemaining > 0) return;
    if (this.user.energy.current < ability.energyCost) return;
    if (ability.slot === "ultimate" && this.ultimateCharge < 1) return;

    const target = this.resolveTarget(ability);
    if (!target && ability.targeting.type === "directional") return;

    this.user.energy.current = Math.max(0, this.user.energy.current - ability.energyCost);
    runtime.cooldownRemaining = ability.cooldownSeconds;
    runtime.lastCastTime = performance.now();
    if (ability.slot === "ultimate") {
      this.ultimateCharge = 0;
    }

    for (const effect of ability.effects) {
      this.applyEffect(effect, ability, target);
    }
  }

  private resolveTarget(ability: AbilityConfig): TestDummy[] | null {
    if (ability.targeting.type === "self") return null;

    const range = ability.targeting.range;
    const camera = this.scene.activeCamera;
    if (!camera) return null;

    this.rayOrigin.copyFrom(camera.globalPosition);
    this.rayDirection.copyFrom(camera.getForwardRay(1).direction);
    this.abilityRay.origin.copyFrom(this.rayOrigin);
    this.abilityRay.direction.copyFrom(this.rayDirection);
    this.abilityRay.length = range;

    const width = ability.targeting.width ?? 0.8;
    const halfWidth = width * 0.5;
    const hits: TestDummy[] = [];
    for (const [mesh, dummy] of this.dummyByMesh) {
      this.tmpToTarget.copyFrom(mesh.position).subtractInPlace(this.rayOrigin);
      const forwardDistance = Vector3.Dot(this.tmpToTarget, this.rayDirection);
      if (forwardDistance < 0 || forwardDistance > range) continue;
      this.tmpPerp.copyFrom(this.tmpToTarget).subtractInPlace(
        this.tmpDirectionScaled.copyFrom(this.rayDirection).scaleInPlace(forwardDistance)
      );
      const perpDistance = this.tmpPerp.length();
      if (perpDistance <= halfWidth) {
        hits.push(dummy);
      }
    }
    if (hits.length === 0) return null;
    return hits;
  }

  private applyEffect(effect: AbilityEffect, ability: AbilityConfig, target: TestDummy[] | null): void {
    switch (effect.type) {
      case "damage": {
        if (!target) return;
        const amount = effect.amount * this.damageMultiplier;
        const staggerAmount = effect.staggerAmount
          ? effect.staggerAmount * this.staggerMultiplier
          : undefined;
        for (const dummy of target) {
          const event: DamageEvent = {
            amount,
            type: effect.damageType,
            sourceId: this.user.id,
            targetId: dummy.getCombatant().id,
            hitPoint: null,
            timestamp: performance.now(),
            staggerAmount,
            sourcePosition: this.user.mesh.position,
          };
          this.combatResolver.applyDamage(dummy.getCombatant(), event);
        }
        this.addUltimateCharge(amount * 0.01);
        if (ability.vfxKey === "plane_strike") {
          this.spawnPlaneStrikeVfx();
        }
        break;
      }
      case "dash": {
        this.camera.getPlanarForward(this.impulseDirection);
        this.user.movement.applyImpulse(this.impulseDirection, effect.speed, effect.duration);
        this.camera.setFovMode("dash");
        this.fovTimer = Math.max(this.fovTimer, effect.duration);
        break;
      }
      case "impulse": {
        this.camera.getPlanarForward(this.impulseDirection);
        if (effect.direction === "back") {
          this.impulseDirection.scaleInPlace(-1);
        } else if (effect.direction === "left") {
          this.camera.getPlanarRight(this.impulseDirection).scaleInPlace(-1);
        } else if (effect.direction === "right") {
          this.camera.getPlanarRight(this.impulseDirection);
        }
        this.user.movement.applyImpulse(this.impulseDirection, effect.speed, effect.duration);
        break;
      }
      case "shield": {
        this.user.applyBarrier(effect.duration, 0, effect.points, 0.0);
        break;
      }
      case "barrier": {
        const reduction = Math.min(0.9, effect.reduction + this.barrierBonus);
        const shieldPoints = effect.shieldPoints + this.shieldBonus;
        this.user.applyBarrier(effect.duration, reduction, shieldPoints, effect.frontalDotThreshold);
        break;
      }
      case "overcharge": {
        this.overchargeTimer = Math.max(this.overchargeTimer, effect.duration);
        this.damageMultiplier = effect.damageMultiplier;
        this.staggerMultiplier = effect.staggerMultiplier;
        this.barrierBonus = effect.barrierBonus;
        this.shieldBonus = effect.shieldBonus;
        this.user.setOverchargeVisual(true);
        break;
      }
      default:
        break;
    }
  }

  getCooldowns(): Record<AbilitySlot, number> {
    const result: Record<AbilitySlot, number> = {
      basic: 0,
      ability1: 0,
      ability2: 0,
      ability3: 0,
      ultimate: 0,
    };
    for (const ability of Object.values(this.loadout)) {
      if (!ability) continue;
      const runtime = this.runtimeById.get(ability.id);
      if (!runtime) continue;
      result[ability.slot] = runtime.cooldownRemaining;
    }
    return result;
  }

  getUltimateCharge(): number {
    return this.ultimateCharge;
  }

  isOverchargeActive(): boolean {
    return this.overchargeTimer > 0;
  }

  private addUltimateCharge(amount: number): void {
    if (this.ultimateCharge >= 1) return;
    this.ultimateCharge = Math.min(1, this.ultimateCharge + amount);
  }

  private spawnPlaneStrikeVfx(): void {
    const forward = this.rayDirection;
    this.camera.getPlanarForward(forward);
    const mesh = MeshBuilder.CreateBox(
      "plane_strike_vfx",
      { width: 4, height: 1.2, depth: 0.18 },
      this.scene
    );
    mesh.position.copyFrom(this.user.mesh.position);
    mesh.position.y += 1.1;
    mesh.material = this.planeMaterial;
    mesh.isPickable = false;
    this.planeVfx.push({
      mesh,
      velocity: forward.clone().scale(12),
      remaining: 0.35,
    });
  }
}
