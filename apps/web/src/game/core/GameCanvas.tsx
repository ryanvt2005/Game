import React, { useEffect, useRef } from "react";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Player } from "../entities/Player";
import { ThirdPersonCamera } from "../systems/ThirdPersonCamera";

type Props = {
  className?: string;
};

export function GameCanvas({ className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const sceneRef = useRef<Scene | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      disableWebGL2Support: false,
    });
    engineRef.current = engine;

    const scene = new Scene(engine);
    sceneRef.current = scene;

    // Light
    new HemisphericLight("light", new Vector3(0, 1, 0), scene);

    const player = new Player(scene);

    const collisionMeshes: AbstractMesh[] = [];
    const addCollider = (mesh: AbstractMesh) => {
      collisionMeshes.push(mesh);
      return mesh;
    };

    // Ground + box (graybox arena starter)
    const ground = MeshBuilder.CreateGround("ground", { width: 50, height: 50 }, scene);
    ground.position.y = 0;

    addCollider(MeshBuilder.CreateBox("wall_north", { width: 40, height: 4, depth: 1 }, scene)).position =
      new Vector3(0, 2, 20);
    addCollider(MeshBuilder.CreateBox("wall_south", { width: 40, height: 4, depth: 1 }, scene)).position =
      new Vector3(0, 2, -20);
    addCollider(MeshBuilder.CreateBox("wall_east", { width: 1, height: 4, depth: 40 }, scene)).position =
      new Vector3(20, 2, 0);
    addCollider(MeshBuilder.CreateBox("wall_west", { width: 1, height: 4, depth: 40 }, scene)).position =
      new Vector3(-20, 2, 0);

    addCollider(MeshBuilder.CreateCylinder("pillar_a", { height: 5, diameter: 2 }, scene)).position =
      new Vector3(6, 2.5, 6);
    addCollider(MeshBuilder.CreateCylinder("pillar_b", { height: 5, diameter: 2 }, scene)).position =
      new Vector3(-6, 2.5, -4);

    addCollider(MeshBuilder.CreateBox("overhang", { width: 8, height: 1, depth: 6 }, scene)).position =
      new Vector3(0, 3.5, 10);

    const lockOnTarget = MeshBuilder.CreateSphere("lock_on_target", { diameter: 1.2 }, scene);
    lockOnTarget.position = new Vector3(8, 1.2, -6);

    const cameraSystem = new ThirdPersonCamera(scene, canvas, player.getFollowTarget(), {
      followDistance: 7,
      followHeight: 1.6,
    });
    cameraSystem.setCollisionMeshes(collisionMeshes);

    let fovMode: "normal" | "dash" = "normal";
    let lockOnActive = false;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "KeyF") {
        fovMode = fovMode === "normal" ? "dash" : "normal";
        cameraSystem.setFovMode(fovMode);
      }
      if (event.code === "KeyL") {
        lockOnActive = !lockOnActive;
        cameraSystem.setLockOnTarget(lockOnActive ? lockOnTarget : null);
      }
    };
    window.addEventListener("keydown", onKeyDown);

    engine.runRenderLoop(() => {
      const deltaSeconds = engine.getDeltaTime() / 1000;
      cameraSystem.update(deltaSeconds);
      scene.render();
    });

    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
      cameraSystem.dispose();
      scene.dispose();
      engine.dispose();
      sceneRef.current = null;
      engineRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className ?? "w-full h-full block"}
      style={{ touchAction: "none" }}
    />
  );
}
