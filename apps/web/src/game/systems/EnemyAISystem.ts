import type { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { CombatResolver } from "../combat/CombatResolver";
import type { Combatant, DamageEvent } from "../combat/CombatTypes";
import type { PlayerMovementSystem } from "./PlayerMovementSystem";
import { EnemyBase } from "../entities/enemies/EnemyBase";
import type { EnemyConfig, EnemyModifier } from "../entities/enemies/EnemyTypes";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";

type Vfx = { mesh: AbstractMesh; remaining: number };

export class EnemyAISystem {
  private readonly scene: Scene;
  private readonly resolver: CombatResolver;
  private readonly player: Combatant;
  private readonly playerMovement: PlayerMovementSystem;
  private readonly enemies: EnemyBase[] = [];
  private readonly vfx: Vfx[] = [];
  private readonly tempTarget = new Vector3();
  private readonly playerPosition = new Vector3();
  private readonly toPlayer = new Vector3();
  private readonly pulseMaterial: StandardMaterial;
  private readonly windupMaterial: StandardMaterial;
  private readonly black = Color3.Black();

  constructor(scene: Scene, resolver: CombatResolver, player: Combatant, playerMovement: PlayerMovementSystem) {
    this.scene = scene;
    this.resolver = resolver;
    this.player = player;
    this.playerMovement = playerMovement;

    this.pulseMaterial = new StandardMaterial("controller_pulse_mat", scene);
    this.pulseMaterial.diffuseColor = new Color3(0.2, 0.9, 1);
    this.pulseMaterial.emissiveColor = new Color3(0.2, 0.9, 1);

    this.windupMaterial = new StandardMaterial("bruiser_windup_mat", scene);
    this.windupMaterial.diffuseColor = new Color3(1, 0.5, 0.2);
    this.windupMaterial.emissiveColor = new Color3(1, 0.5, 0.2);
  }

  spawnEnemy(config: EnemyConfig, position: Vector3, modifiers: EnemyModifier[] = []): EnemyBase {
    const enemy = new EnemyBase(this.scene, this.resolver, config, position, modifiers);
    enemy.setOnDeath((dead) => {
      if (dead.getModifiers().has("volatile")) {
        this.spawnExplosion(dead.getMesh().position.clone());
        const distance = Vector3.Distance(dead.getMesh().position, this.player.getPosition?.() ?? Vector3.Zero());
        if (distance <= 3.5) {
          const event: DamageEvent = {
            amount: 10,
            type: "energy",
            sourceId: dead.getCombatant().id,
            targetId: this.player.id,
            hitPoint: null,
            timestamp: performance.now(),
            staggerAmount: 8,
            sourcePosition: dead.getMesh().position,
          };
          this.resolver.applyDamage(this.player, event);
        }
      }
    });
    this.enemies.push(enemy);
    return enemy;
  }

  clear(): void {
    for (const enemy of this.enemies) {
      enemy.getMesh().dispose();
    }
    this.enemies.length = 0;
    for (const fx of this.vfx) {
      fx.mesh.dispose();
    }
    this.vfx.length = 0;
  }

  update(deltaSeconds: number): void {
    if (this.player.getPosition) {
      this.playerPosition.copyFrom(this.player.getPosition());
    } else {
      return;
    }

    for (const enemy of this.enemies) {
      if (!enemy.isAlive()) continue;
      this.resolver.updateStagger(enemy.getCombatant().stagger!, deltaSeconds);
      enemy.updateVisual(deltaSeconds);
      enemy.updateState(deltaSeconds);
      this.updateEnemyAI(enemy, deltaSeconds);
      enemy.updateMovement(deltaSeconds, this.playerPosition);
    }

    for (let i = this.vfx.length - 1; i >= 0; i -= 1) {
      this.vfx[i].remaining -= deltaSeconds;
      if (this.vfx[i].remaining <= 0) {
        this.vfx[i].mesh.dispose();
        this.vfx.splice(i, 1);
      }
    }
  }

  private updateEnemyAI(enemy: EnemyBase, deltaSeconds: number): void {
    const config = enemy.getConfig();
    this.toPlayer.copyFrom(this.playerPosition).subtractInPlace(enemy.getMesh().position);
    const distance = this.toPlayer.length();
    const inRange = distance <= config.attackRange;

    if (enemy.isStaggered()) {
      enemy.setState("recover", 0.2);
      enemy.setScale(1);
      return;
    }

    const cooldown = enemy.getCooldownTimer();
    if (cooldown > 0) {
      enemy.setCooldownTimer(Math.max(0, cooldown - deltaSeconds));
    }

    if (enemy.getState() === "windup") {
      if (enemy.getStateTimer() === 0) {
        if (inRange) {
          this.performAttack(enemy);
        }
        enemy.setEmissive(this.black);
        enemy.setScale(1);
        enemy.setState("recover", config.attackRecover);
      }
      return;
    }

    if (enemy.getState() === "recover") {
      if (enemy.getStateTimer() === 0) {
        enemy.setState("chase");
      }
      return;
    }

    if (!inRange) {
      enemy.setState("chase");
      return;
    }

    if (cooldown === 0) {
      enemy.setCooldownTimer(config.attackCooldown * this.getAdaptiveCooldownScale(enemy));
      enemy.setState("windup", config.attackWindup);
      if (config.archetype === "bruiser") {
        enemy.setEmissive(this.windupMaterial.emissiveColor);
        enemy.setScale(1.12);
      }
      return;
    }

    enemy.setState("chase");
  }

  private performAttack(enemy: EnemyBase): void {
    const config = enemy.getConfig();

    if (config.attackType === "pulse") {
      this.spawnPulse(enemy.getMesh().position.clone(), config.attackRange);
      if (config.slowMultiplier && config.slowDuration) {
        this.playerMovement.applySlow(config.slowMultiplier, config.slowDuration);
      }
    }

    const event: DamageEvent = {
      amount: config.damage,
      type: config.attackType === "pulse" ? "energy" : "physical",
      sourceId: enemy.getCombatant().id,
      targetId: this.player.id,
      hitPoint: null,
      timestamp: performance.now(),
      staggerAmount: config.stagger,
      sourcePosition: enemy.getMesh().position,
    };
    this.resolver.applyDamage(this.player, event);

    if (config.archetype === "bruiser") {
      const mesh = enemy.getMesh();
      mesh.scaling.y *= 1.05;
    }
  }

  private getAdaptiveCooldownScale(enemy: EnemyBase): number {
    if (!enemy.getModifiers().has("adaptive")) return 1;
    if (enemy.getAdaptiveHits() >= 3) {
      enemy.resetAdaptiveHits();
      return 0.8;
    }
    return 1;
  }

  private spawnPulse(position: Vector3, radius: number): void {
    const ring = MeshBuilder.CreateTorus("controller_pulse", { diameter: radius * 2, thickness: 0.1 }, this.scene);
    ring.position.copyFrom(position);
    ring.position.y = 0.2;
    ring.rotation.x = Math.PI / 2;
    ring.material = this.pulseMaterial;
    ring.isPickable = false;
    this.vfx.push({ mesh: ring, remaining: 0.4 });
  }

  private spawnExplosion(position: Vector3): void {
    const sphere = MeshBuilder.CreateSphere("volatile_explosion", { diameter: 2.5 }, this.scene);
    sphere.position.copyFrom(position);
    sphere.position.y = 0.8;
    const mat = new StandardMaterial("volatile_explosion_mat", this.scene);
    mat.diffuseColor = new Color3(1, 0.3, 0.1);
    mat.emissiveColor = new Color3(1, 0.3, 0.1);
    sphere.material = mat;
    sphere.isPickable = false;
    this.vfx.push({ mesh: sphere, remaining: 0.3 });
  }
}
