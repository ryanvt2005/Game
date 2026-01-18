import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export class Player {
  private readonly root: AbstractMesh;
  private readonly followTarget: TransformNode;
  private readonly id: string;

  constructor(scene: Scene) {
    this.id = "player_1";
    this.root = MeshBuilder.CreateCapsule(
      "player_body",
      { height: 2.2, radius: 0.45 },
      scene
    );
    this.root.position = new Vector3(0, 1.1, 0);

    this.followTarget = new TransformNode("player_follow_target", scene);
    this.followTarget.parent = this.root;
    this.followTarget.position = new Vector3(0, 0.4, 0);
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
}
