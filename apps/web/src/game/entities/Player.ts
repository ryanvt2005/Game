import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Combatant, DefenseComponent, StaggerComponent } from "../combat/CombatTypes";

export class Player {
  private readonly root: AbstractMesh;
  private readonly followTarget: TransformNode;
  private readonly id: string;
  private readonly energy = { max: 100, current: 100, regenRate: 12 };
  private readonly health = { maxHealth: 140, currentHealth: 140 };
  private readonly stagger: StaggerComponent = {
    staggerThreshold: 40,
    staggerValue: 0,
    isStaggered: false,
    staggerDuration: 0.6,
    staggerTimer: 0,
    cooldown: 0.4,
    cooldownTimer: 0,
  };
  private readonly defense: DefenseComponent = {
    barrierActive: false,
    barrierTimer: 0,
    frontalDotThreshold: 0.35,
    reduction: 0.4,
    shieldPoints: 0,
  };
  private isDead = false;
  private readonly combatant: Combatant;
  private readonly material: StandardMaterial;
  private readonly baseColor = new Color3(0.2, 0.7, 0.9);
  private readonly overchargeColor = new Color3(0.6, 0.9, 1);
  private readonly black = Color3.Black();

  constructor(scene: Scene) {
    this.id = "player_1";
    this.root = MeshBuilder.CreateCapsule(
      "player_body",
      { height: 2.2, radius: 0.45 },
      scene
    );
    this.root.position = new Vector3(0, 1.1, 0);

    this.material = new StandardMaterial("player_mat", scene);
    this.material.diffuseColor = this.baseColor.clone();
    this.material.emissiveColor = this.black.clone();
    this.root.material = this.material;

    this.followTarget = new TransformNode("player_follow_target", scene);
    this.followTarget.parent = this.root;
    this.followTarget.position = new Vector3(0, 0.4, 0);

    this.combatant = {
      id: this.id,
      health: this.health,
      energy: {
        maxEnergy: this.energy.max,
        currentEnergy: this.energy.current,
        regenRate: this.energy.regenRate,
      },
      stagger: this.stagger,
      defense: this.defense,
      isDead: this.isDead,
      setDead: () => {
        this.isDead = true;
      },
      getPosition: () => this.root.position,
      getForward: () => this.root.forward,
    };
  }

  getRoot(): AbstractMesh {
    return this.root;
  }

  getFollowTarget(): TransformNode {
    return this.followTarget;
  }

  getId(): string {
    return this.id;
  }

  getEnergy(): { max: number; current: number; regenRate: number } {
    return this.energy;
  }

  applyBarrier(duration: number, reduction: number, shieldPoints: number, frontalDot: number): void {
    this.defense.barrierActive = true;
    this.defense.barrierTimer = duration;
    this.defense.reduction = reduction;
    this.defense.frontalDotThreshold = frontalDot;
    this.defense.shieldPoints = shieldPoints;
  }

  updateDefense(deltaSeconds: number): void {
    if (!this.defense.barrierActive) return;
    this.defense.barrierTimer = Math.max(0, this.defense.barrierTimer - deltaSeconds);
    if (this.defense.barrierTimer === 0) {
      this.defense.barrierActive = false;
      this.defense.shieldPoints = 0;
    }
  }

  getCombatant(): Combatant {
    return this.combatant;
  }

  setOverchargeShield(points: number): void {
    this.defense.shieldPoints = points;
  }

  isBarrierActive(): boolean {
    return this.defense.barrierActive;
  }

  setOverchargeVisual(active: boolean): void {
    if (active) {
      this.material.emissiveColor.copyFrom(this.overchargeColor);
    } else {
      this.material.emissiveColor.copyFrom(this.black);
    }
  }
}
