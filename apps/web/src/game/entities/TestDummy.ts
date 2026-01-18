import type { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { Combatant, DamageEvent, StaggerComponent } from "../combat/CombatTypes";
import { CombatResolver } from "../combat/CombatResolver";

export class TestDummy {
  private readonly mesh: AbstractMesh;
  private readonly material: StandardMaterial;
  private readonly combatant: Combatant;
  private hitFlashTimer = 0;
  private readonly baseColor = new Color3(0.25, 0.5, 0.8);
  private readonly staggerColor = new Color3(1, 0.8, 0.2);
  private readonly hitColor = new Color3(1, 0.25, 0.25);
  private readonly deadColor = new Color3(0.2, 0.2, 0.2);
  private readonly black = Color3.Black();

  constructor(scene: Scene, resolver: CombatResolver, position: Vector3, id: string) {
    this.mesh = MeshBuilder.CreateCylinder(
      `dummy_${id}`,
      { height: 2.4, diameter: 1.2 },
      scene
    );
    this.mesh.position.copyFrom(position);
    this.mesh.isPickable = true;
    this.mesh.checkCollisions = true;

    this.material = new StandardMaterial(`dummy_mat_${id}`, scene);
    this.material.diffuseColor = this.baseColor.clone();
    this.material.emissiveColor = this.black.clone();
    this.mesh.material = this.material;

    const stagger: StaggerComponent = {
      staggerThreshold: 25,
      staggerValue: 0,
      isStaggered: false,
      staggerDuration: 0.8,
      staggerTimer: 0,
      cooldown: 0.4,
      cooldownTimer: 0,
    };

    this.combatant = {
      id,
      health: { maxHealth: 100, currentHealth: 100 },
      energy: { maxEnergy: 50, currentEnergy: 50, regenRate: 5 },
      stagger,
      isDead: false,
      setDead: () => {
        this.combatant.isDead = true;
        this.mesh.isPickable = false;
        this.mesh.checkCollisions = false;
        this.material.emissiveColor.copyFrom(this.black);
        this.material.diffuseColor.copyFrom(this.deadColor);
        this.mesh.scaling.y = 0.4;
      },
    };

    resolver.events.onHit((event, target) => {
      if (target.id !== this.combatant.id) return;
      this.handleHit(event);
    });

    resolver.events.onStagger((target) => {
      if (target.id !== this.combatant.id) return;
      this.material.emissiveColor = this.staggerColor.clone();
    });
  }

  getCombatant(): Combatant {
    return this.combatant;
  }

  getMesh(): AbstractMesh {
    return this.mesh;
  }

  update(resolver: CombatResolver, deltaSeconds: number): void {
    if (this.combatant.isDead) return;

    if (this.combatant.stagger) {
      resolver.updateStagger(this.combatant.stagger, deltaSeconds);
      if (this.combatant.stagger.isStaggered) {
        this.material.emissiveColor.copyFrom(this.staggerColor);
      }
    }

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer = Math.max(0, this.hitFlashTimer - deltaSeconds);
    }

    if (!this.combatant.stagger?.isStaggered && this.hitFlashTimer === 0) {
      this.material.emissiveColor.copyFrom(this.black);
    }
  }

  private handleHit(event: DamageEvent): void {
    if (this.combatant.isDead) return;
    this.hitFlashTimer = event.type === "fracture" ? 0.18 : 0.12;
    if (!this.combatant.stagger?.isStaggered) {
      this.material.emissiveColor.copyFrom(this.hitColor);
    }
  }
}
