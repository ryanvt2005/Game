import type { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Combatant, StaggerComponent } from "../../combat/CombatTypes";
import type { EnemyConfig, EnemyModifier } from "./EnemyTypes";
import type { CombatResolver } from "../../combat/CombatResolver";

type EnemyState = "idle" | "chase" | "windup" | "recover";

export class EnemyBase {
  private readonly scene: Scene;
  private readonly config: EnemyConfig;
  private readonly mesh: AbstractMesh;
  private readonly material: StandardMaterial;
  private readonly combatant: Combatant;
  private readonly stagger: StaggerComponent;
  private readonly id: string;
  private readonly modifiers: Set<EnemyModifier>;
  private readonly baseColor: Color3;
  private readonly hitColor = new Color3(1, 0.4, 0.4);
  private readonly staggerColor = new Color3(1, 0.8, 0.2);
  private readonly deadColor = new Color3(0.2, 0.2, 0.2);
  private readonly black = Color3.Black();
  private readonly toTarget = new Vector3();
  private readonly moveDelta = new Vector3();
  private readonly baseScaling = new Vector3(1, 1, 1);

  private hitFlashTimer = 0;
  private attackCooldownTimer = 0;
  private state: EnemyState = "idle";
  private stateTimer = 0;
  private adaptiveHits = 0;
  private isDead = false;
  private onDeath?: (enemy: EnemyBase) => void;

  constructor(scene: Scene, resolver: CombatResolver, config: EnemyConfig, position: Vector3, modifiers: EnemyModifier[] = []) {
    this.scene = scene;
    this.config = config;
    this.id = `${config.archetype}_${Math.floor(Math.random() * 9999)}`;
    this.modifiers = new Set(modifiers);
    this.baseColor = config.color;

    const sizeScale = config.archetype === "bruiser" ? 1.4 : config.archetype === "controller" ? 1.1 : 1.0;
    this.mesh = MeshBuilder.CreateCapsule(
      `enemy_${this.id}`,
      { height: 2.1 * sizeScale, radius: 0.45 * sizeScale },
      scene
    );
    this.mesh.position.copyFrom(position);
    this.mesh.checkCollisions = true;
    this.mesh.isPickable = true;
    this.baseScaling.copyFrom(this.mesh.scaling);

    this.material = new StandardMaterial(`enemy_mat_${this.id}`, scene);
    this.material.diffuseColor = this.baseColor.clone();
    this.material.emissiveColor = this.black.clone();
    this.mesh.material = this.material;

    this.stagger = {
      staggerThreshold: config.staggerThreshold,
      staggerValue: 0,
      isStaggered: false,
      staggerDuration: 0.5,
      staggerTimer: 0,
      cooldown: 0.3,
      cooldownTimer: 0,
    };

    if (this.modifiers.has("hardened")) {
      this.stagger.staggerThreshold *= 1.6;
    }

    this.combatant = {
      id: this.id,
      health: { maxHealth: config.maxHealth, currentHealth: config.maxHealth },
      stagger: this.stagger,
      isDead: false,
      setDead: () => {
        this.isDead = true;
        this.mesh.isPickable = false;
        this.mesh.checkCollisions = false;
        this.material.diffuseColor.copyFrom(this.deadColor);
        this.material.emissiveColor.copyFrom(this.black);
        this.mesh.scaling.y = 0.3;
        this.combatant.isDead = true;
        this.onDeath?.(this);
      },
      getPosition: () => this.mesh.position,
      getForward: () => this.mesh.forward,
    };

    resolver.events.onHit((event, target) => {
      if (target.id !== this.combatant.id) return;
      this.hitFlashTimer = 0.12;
      if (!this.stagger.isStaggered) {
        this.material.emissiveColor.copyFrom(this.hitColor);
      }
      if (event.sourceId === "player_1" && this.modifiers.has("adaptive")) {
        this.adaptiveHits += 1;
      }
    });

    resolver.events.onStagger((target) => {
      if (target.id !== this.combatant.id) return;
      this.material.emissiveColor.copyFrom(this.staggerColor);
    });
  }

  getCombatant(): Combatant {
    return this.combatant;
  }

  getMesh(): AbstractMesh {
    return this.mesh;
  }

  getMaterial(): StandardMaterial {
    return this.material;
  }

  getConfig(): EnemyConfig {
    return this.config;
  }

  getState(): EnemyState {
    return this.state;
  }

  setState(state: EnemyState, timer = 0): void {
    this.state = state;
    this.stateTimer = timer;
  }

  getStateTimer(): number {
    return this.stateTimer;
  }

  getCooldownTimer(): number {
    return this.attackCooldownTimer;
  }

  setCooldownTimer(value: number): void {
    this.attackCooldownTimer = value;
  }

  setOnDeath(callback: (enemy: EnemyBase) => void): void {
    this.onDeath = callback;
  }

  isStaggered(): boolean {
    return this.stagger.isStaggered;
  }

  isAlive(): boolean {
    return !this.isDead;
  }

  getModifiers(): Set<EnemyModifier> {
    return this.modifiers;
  }

  getAdaptiveHits(): number {
    return this.adaptiveHits;
  }

  resetAdaptiveHits(): void {
    this.adaptiveHits = 0;
  }

  updateVisual(deltaSeconds: number): void {
    if (this.isDead) return;

    if (this.stagger.isStaggered) {
      this.material.emissiveColor.copyFrom(this.staggerColor);
    }

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer = Math.max(0, this.hitFlashTimer - deltaSeconds);
    }

    if (this.state !== "windup" && !this.stagger.isStaggered && this.hitFlashTimer === 0) {
      this.material.emissiveColor.copyFrom(this.black);
    }
  }

  setEmissive(color: Color3): void {
    this.material.emissiveColor.copyFrom(color);
  }

  setScale(multiplier: number): void {
    this.mesh.scaling.x = this.baseScaling.x * multiplier;
    this.mesh.scaling.y = this.baseScaling.y * multiplier;
    this.mesh.scaling.z = this.baseScaling.z * multiplier;
  }

  updateMovement(deltaSeconds: number, targetPosition: Vector3): void {
    if (this.isDead) return;
    if (this.stagger.isStaggered) return;
    if (this.state !== "chase") return;

    this.toTarget.copyFrom(targetPosition).subtractInPlace(this.mesh.position);
    this.toTarget.y = 0;
    const distance = this.toTarget.length();
    if (distance < 0.001) return;
    this.toTarget.scaleInPlace(1 / distance);
    this.moveDelta.copyFrom(this.toTarget).scaleInPlace(this.config.speed * deltaSeconds);
    this.mesh.moveWithCollisions(this.moveDelta);
    this.mesh.rotation.y = Math.atan2(this.toTarget.x, this.toTarget.z);
  }

  updateState(deltaSeconds: number): void {
    if (this.stateTimer > 0) {
      this.stateTimer = Math.max(0, this.stateTimer - deltaSeconds);
    }
  }
}
