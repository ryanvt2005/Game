import React, { useEffect, useRef } from "react";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Player } from "../entities/Player";
import { TestDummy } from "../entities/TestDummy";
import { CombatResolver } from "../combat/CombatResolver";
import { AbilitySystem } from "../abilities/AbilitySystem";
import { playerLoadout } from "../abilities/AbilityConfigs";
import { PlayerMovementSystem } from "../systems/PlayerMovementSystem";
import { ThirdPersonCamera } from "../systems/ThirdPersonCamera";
import { EnemyAISystem } from "../systems/EnemyAISystem";
import { gruntConfig, bruiserConfig, controllerConfig } from "../entities/enemies/EnemyConfigs";

type Props = {
  className?: string;
  onHudUpdate?: (state: HudState) => void;
};

type HudState = {
  heroName: string;
  energyCurrent: number;
  energyMax: number;
  cooldowns: Record<"basic" | "ability1" | "ability2" | "ability3" | "ultimate", number>;
  ultimateCharge: number;
  ultimateReady: boolean;
  overchargeActive: boolean;
  barrierActive: boolean;
};

export function GameCanvas({ className, onHudUpdate }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const hudCallbackRef = useRef<Props["onHudUpdate"]>(null);

  useEffect(() => {
    hudCallbackRef.current = onHudUpdate ?? null;
  }, [onHudUpdate]);

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
    const combatResolver = new CombatResolver();
    const playerCombatant = player.getCombatant();

    const collisionMeshes: AbstractMesh[] = [];
    const addCollider = (mesh: AbstractMesh) => {
      collisionMeshes.push(mesh);
      return mesh;
    };

    // Ground + box (graybox arena starter)
    const ground = MeshBuilder.CreateGround("ground", { width: 50, height: 50 }, scene);
    ground.position.y = 0;
    addCollider(ground);

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

    const movementSystem = new PlayerMovementSystem(scene, player.getRoot(), cameraSystem);
    movementSystem.setCollisionMeshes(collisionMeshes);

    const dummies = [
      new TestDummy(scene, combatResolver, new Vector3(4, 1.2, 2), "dummy_a"),
      new TestDummy(scene, combatResolver, new Vector3(-3, 1.2, -6), "dummy_b"),
      new TestDummy(scene, combatResolver, new Vector3(0, 1.2, 12), "dummy_c"),
    ];
    const dummyByMesh = new Map<AbstractMesh, TestDummy>(
      dummies.map((dummy) => [dummy.getMesh(), dummy])
    );

    const abilitySystem = new AbilitySystem(
      scene,
      cameraSystem,
      combatResolver,
      {
        id: player.getId(),
        mesh: player.getRoot(),
        energy: player.getEnergy(),
        applyBarrier: (duration, reduction, shieldPoints, frontalDot) =>
          player.applyBarrier(duration, reduction, shieldPoints, frontalDot),
        updateDefense: (deltaSeconds) => player.updateDefense(deltaSeconds),
        isBarrierActive: () => player.isBarrierActive(),
        movement: movementSystem,
      },
      playerLoadout,
      dummyByMesh
    );

    const enemySystem = new EnemyAISystem(scene, combatResolver, playerCombatant, movementSystem);
    const spawnWave = () => {
      enemySystem.clear();
      enemySystem.spawnEnemy(gruntConfig, new Vector3(-10, 1.1, -6), ["hardened"]);
      enemySystem.spawnEnemy(gruntConfig, new Vector3(-8, 1.1, -2));
      enemySystem.spawnEnemy(gruntConfig, new Vector3(-6, 1.1, 2));
      enemySystem.spawnEnemy(bruiserConfig, new Vector3(10, 1.1, 6), ["volatile"]);
      enemySystem.spawnEnemy(controllerConfig, new Vector3(6, 1.1, -10), ["adaptive"]);
    };
    spawnWave();

    let fovMode: "normal" | "dash" = "normal";
    let lockOnActive = false;
    const frontDamageSource = new Vector3();
    const backDamageSource = new Vector3();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "KeyF") {
        fovMode = fovMode === "normal" ? "dash" : "normal";
        cameraSystem.setFovMode(fovMode);
      }
      if (event.code === "KeyL") {
        lockOnActive = !lockOnActive;
        cameraSystem.setLockOnTarget(lockOnActive ? lockOnTarget : null);
      }
      if (event.code === "KeyQ") {
        abilitySystem.tryCast("ability1");
      }
      if (event.code === "KeyE") {
        abilitySystem.tryCast("ability2");
      }
      if (event.code === "KeyR") {
        abilitySystem.tryCast("ability3");
      }
      if (event.code === "KeyT") {
        abilitySystem.tryCast("ultimate");
      }
      if (event.code === "KeyH") {
        frontDamageSource.copyFrom(player.getRoot().position);
        frontDamageSource.z += 4;
        combatResolver.applyDamage(playerCombatant, {
          amount: 12,
          type: "physical",
          sourceId: "debug_front",
          targetId: player.getId(),
          hitPoint: null,
          timestamp: performance.now(),
          sourcePosition: frontDamageSource,
          staggerAmount: 6,
        });
      }
      if (event.code === "KeyJ") {
        backDamageSource.copyFrom(player.getRoot().position);
        backDamageSource.z -= 4;
        combatResolver.applyDamage(playerCombatant, {
          amount: 12,
          type: "physical",
          sourceId: "debug_back",
          targetId: player.getId(),
          hitPoint: null,
          timestamp: performance.now(),
          sourcePosition: backDamageSource,
          staggerAmount: 6,
        });
      }
      if (event.code === "KeyP") {
        spawnWave();
      }
    };
    const onMouseDown = (event: MouseEvent) => {
      if (event.button === 0) {
        abilitySystem.tryCast("basic");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onMouseDown);

    let hudTimer = 0;
    engine.runRenderLoop(() => {
      const deltaSeconds = engine.getDeltaTime() / 1000;
      movementSystem.update(deltaSeconds);
      cameraSystem.update(deltaSeconds);
      abilitySystem.update(deltaSeconds);
      if (playerCombatant.stagger) {
        combatResolver.updateStagger(playerCombatant.stagger, deltaSeconds);
      }
      for (const dummy of dummies) {
        dummy.update(combatResolver, deltaSeconds);
      }
      enemySystem.update(deltaSeconds);
      if (hudCallbackRef.current) {
        hudTimer += deltaSeconds;
        if (hudTimer >= 0.1) {
          hudTimer = 0;
          const cooldowns = abilitySystem.getCooldowns();
          const energy = abilitySystem.getEnergy();
          const ultimateCharge = abilitySystem.getUltimateCharge();
          hudCallbackRef.current({
            heroName: "Aegis Vector",
            energyCurrent: energy.current,
            energyMax: energy.max,
            cooldowns,
            ultimateCharge,
            ultimateReady: ultimateCharge >= 1,
            overchargeActive: abilitySystem.isOverchargeActive(),
            barrierActive: abilitySystem.isBarrierActive(),
          });
        }
      }
      scene.render();
    });

    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onMouseDown);
      enemySystem.clear();
      movementSystem.dispose();
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
