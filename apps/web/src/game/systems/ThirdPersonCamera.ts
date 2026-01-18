import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import type { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Ray } from "@babylonjs/core/Culling/ray";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";

type FovMode = "normal" | "dash";

type ThirdPersonCameraOptions = {
  followDistance: number;
  followHeight: number;
  yawSensitivity: number;
  pitchSensitivity: number;
  pitchMin: number;
  pitchMax: number;
  positionSmoothing: number;
  collisionSmoothing: number;
  collisionPadding: number;
  fovNormal: number;
  fovDash: number;
  fovSmoothing: number;
  lockOnStrength: number;
};

const DEFAULT_OPTIONS: ThirdPersonCameraOptions = {
  followDistance: 6,
  followHeight: 1.5,
  yawSensitivity: 0.002,
  pitchSensitivity: 0.002,
  pitchMin: -Math.PI / 3,
  pitchMax: Math.PI / 9,
  positionSmoothing: 12,
  collisionSmoothing: 20,
  collisionPadding: 0.4,
  fovNormal: 0.9,
  fovDash: 1.1,
  fovSmoothing: 8,
  lockOnStrength: 4,
};

export class ThirdPersonCamera {
  private readonly camera: FreeCamera;
  private readonly scene: Scene;
  private readonly canvas: HTMLCanvasElement;
  private readonly target: TransformNode;
  private readonly options: ThirdPersonCameraOptions;
  private readonly ray: Ray;
  private readonly collisionMeshes = new Set<AbstractMesh>();
  private readonly desiredPosition = new Vector3();
  private readonly desiredDirection = new Vector3();
  private readonly targetPosition = new Vector3();
  private readonly tmpVector = new Vector3();
  private readonly tmpVector2 = new Vector3();
  private readonly lookTarget = new Vector3();

  private yaw = 0;
  private pitch = 0;
  private targetFov: number;
  private lockOnTarget: TransformNode | null = null;
  private isPointerDown = false;
  private pendingDeltaX = 0;
  private pendingDeltaY = 0;
  private unbindInputFn: (() => void) | null = null;

  constructor(scene: Scene, canvas: HTMLCanvasElement, target: TransformNode, options?: Partial<ThirdPersonCameraOptions>) {
    this.scene = scene;
    this.canvas = canvas;
    this.target = target;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.targetFov = this.options.fovNormal;

    this.camera = new FreeCamera("third_person_camera", new Vector3(0, 2, -6), scene);
    this.camera.minZ = 0.1;
    this.camera.fov = this.targetFov;
    scene.activeCamera = this.camera;

    this.ray = new Ray(Vector3.Zero(), Vector3.Forward(), 1);

    this.bindInput();
  }

  setCollisionMeshes(meshes: AbstractMesh[]): void {
    this.collisionMeshes.clear();
    for (const mesh of meshes) {
      this.collisionMeshes.add(mesh);
    }
  }

  setFovMode(mode: FovMode): void {
    this.targetFov = mode === "dash" ? this.options.fovDash : this.options.fovNormal;
  }

  setTargetFov(value: number): void {
    this.targetFov = value;
  }

  setLockOnTarget(target: TransformNode | null): void {
    this.lockOnTarget = target;
  }

  update(deltaSeconds: number): void {
    this.applyRotation(deltaSeconds);
    this.updateFov(deltaSeconds);
    this.updatePosition(deltaSeconds);
  }

  dispose(): void {
    this.unbindInputFn?.();
    this.camera.dispose();
  }

  private bindInput(): void {
    const onPointerDown = () => {
      this.isPointerDown = true;
      if (this.canvas.requestPointerLock) {
        this.canvas.requestPointerLock();
      }
    };
    const onPointerUp = () => {
      this.isPointerDown = false;
    };
    const onPointerMove = (event: MouseEvent) => {
      const locked = document.pointerLockElement === this.canvas;
      if (!locked && !this.isPointerDown) return;
      this.pendingDeltaX += event.movementX;
      this.pendingDeltaY += event.movementY;
    };

    this.canvas.addEventListener("pointerdown", onPointerDown);
    this.canvas.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("mousemove", onPointerMove);

    this.unbindInputFn = () => {
      this.canvas.removeEventListener("pointerdown", onPointerDown);
      this.canvas.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("mousemove", onPointerMove);
    };
  }

  private applyRotation(deltaSeconds: number): void {
    const deltaX = this.pendingDeltaX;
    const deltaY = this.pendingDeltaY;
    this.pendingDeltaX = 0;
    this.pendingDeltaY = 0;

    this.yaw += deltaX * this.options.yawSensitivity;
    this.pitch -= deltaY * this.options.pitchSensitivity;

    if (this.lockOnTarget) {
      const targetPos = this.lockOnTarget.getAbsolutePosition();
      const followPos = this.target.getAbsolutePosition();
      const toTarget = this.tmpVector.copyFrom(targetPos).subtractInPlace(followPos);
      const desiredYaw = Math.atan2(toTarget.x, toTarget.z);
      const lockAlpha = this.smoothingAlpha(this.options.lockOnStrength, deltaSeconds);
      this.yaw = this.lerpAngle(this.yaw, desiredYaw, lockAlpha);
    }

    this.pitch = Math.min(this.options.pitchMax, Math.max(this.options.pitchMin, this.pitch));
  }

  private updateFov(deltaSeconds: number): void {
    const alpha = this.smoothingAlpha(this.options.fovSmoothing, deltaSeconds);
    this.camera.fov = this.lerp(this.camera.fov, this.targetFov, alpha);
  }

  private updatePosition(deltaSeconds: number): void {
    this.targetPosition.copyFrom(this.target.getAbsolutePosition());
    this.targetPosition.y += this.options.followHeight;

    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);

    this.desiredDirection.set(sinYaw * cosPitch, sinPitch, cosYaw * cosPitch);
    this.desiredPosition.copyFrom(this.targetPosition).subtractInPlace(
      this.tmpVector.copyFrom(this.desiredDirection).scaleInPlace(this.options.followDistance)
    );

    const collisionHit = this.resolveCollision(this.targetPosition, this.desiredPosition);
    const alpha = this.smoothingAlpha(
      collisionHit ? this.options.collisionSmoothing : this.options.positionSmoothing,
      deltaSeconds
    );
    Vector3.LerpToRef(this.camera.position, this.desiredPosition, alpha, this.camera.position);

    this.lookTarget.copyFrom(this.targetPosition);
    this.camera.setTarget(this.lookTarget);
  }

  private resolveCollision(origin: Vector3, desired: Vector3): boolean {
    if (this.collisionMeshes.size === 0) return false;

    this.tmpVector2.copyFrom(desired).subtractInPlace(origin);
    const distance = this.tmpVector2.length();
    if (distance <= 0.001) return false;

    this.tmpVector2.scaleInPlace(1 / distance);
    this.ray.origin.copyFrom(origin);
    this.ray.direction.copyFrom(this.tmpVector2);
    this.ray.length = distance;

    const hit = this.scene.pickWithRay(this.ray, (mesh) => this.collisionMeshes.has(mesh));
    if (!hit || !hit.hit || hit.distance === undefined) {
      return false;
    }

    const adjustedDistance = Math.max(0.5, hit.distance - this.options.collisionPadding);
    desired.copyFrom(origin).addInPlace(this.tmpVector2.scaleInPlace(adjustedDistance));
    return true;
  }

  private smoothingAlpha(strength: number, deltaSeconds: number): number {
    return 1 - Math.exp(-strength * deltaSeconds);
  }

  private lerp(a: number, b: number, alpha: number): number {
    return a + (b - a) * alpha;
  }

  private lerpAngle(a: number, b: number, alpha: number): number {
    const delta = Math.atan2(Math.sin(b - a), Math.cos(b - a));
    return a + delta * alpha;
  }
}
