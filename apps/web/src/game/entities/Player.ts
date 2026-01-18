import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export class Player {
  private readonly root: TransformNode;
  private readonly followTarget: TransformNode;

  constructor(scene: Scene) {
    this.root = new TransformNode("player_root", scene);
    this.root.position = new Vector3(0, 0, 0);

    const body = MeshBuilder.CreateCapsule(
      "player_body",
      { height: 2.2, radius: 0.45 },
      scene
    );
    body.parent = this.root;
    body.position = new Vector3(0, 1.1, 0);

    this.followTarget = new TransformNode("player_follow_target", scene);
    this.followTarget.parent = this.root;
    this.followTarget.position = new Vector3(0, 1.5, 0);
  }

  getRoot(): TransformNode {
    return this.root;
  }

  getFollowTarget(): TransformNode {
    return this.followTarget;
  }
}
