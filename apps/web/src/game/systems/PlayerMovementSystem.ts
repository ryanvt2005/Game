import type { Scene } from "@babylonjs/core/scene";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Ray } from "@babylonjs/core/Culling/ray";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Quaternion } from "@babylonjs/core/Maths/math.vector";
import { ThirdPersonCamera } from "./ThirdPersonCamera";

type PlayerMovementOptions = {
  maxRunSpeed: number;
  acceleration: number;
  deceleration: number;
  turnSpeed: number;
  airControl: number;
  jumpSpeed: number;
  gravity: number;
  groundCheckDistance: number;
  dashSpeed: number;
  dashDuration: number;
  dashCooldown: number;
};

const DEFAULT_OPTIONS: PlayerMovementOptions = {
  maxRunSpeed: 6,
  acceleration: 22,
  deceleration: 28,
  turnSpeed: 10,
  airControl: 0.4,
  jumpSpeed: 7.5,
  gravity: 24,
  groundCheckDistance: 0.3,
  dashSpeed: 14,
  dashDuration: 0.18,
  dashCooldown: 0.75,
};

export class PlayerMovementSystem {
  private readonly scene: Scene;
  private readonly playerMesh: AbstractMesh;
  private readonly cameraSystem: ThirdPersonCamera;
  private readonly options: PlayerMovementOptions;
  private readonly groundRay: Ray;
  private readonly collisionMeshes = new Set<AbstractMesh>();
  private readonly input = { forward: false, back: false, left: false, right: false };
  private readonly desiredMove = new Vector3();
  private readonly forward = new Vector3();
  private readonly right = new Vector3();
  private readonly horizontalVelocity = new Vector3();
  private readonly moveDelta = new Vector3();
  private readonly dashDirection = new Vector3();
  private readonly tmpVector = new Vector3();
  private readonly rotationQuat = new Quaternion();
  private readonly down = new Vector3(0, -1, 0);

  private verticalVelocity = 0;
  private grounded = false;
  private jumpQueued = false;
  private dashQueued = false;
  private dashRemaining = 0;
  private dashCooldownRemaining = 0;
  private impulseRemaining = 0;
  private impulseSpeed = 0;
  private readonly impulseDirection = new Vector3();
  private facingYaw = 0;
  private unbindInputFn: (() => void) | null = null;

  constructor(scene: Scene, playerMesh: AbstractMesh, cameraSystem: ThirdPersonCamera, options?: Partial<PlayerMovementOptions>) {
    this.scene = scene;
    this.playerMesh = playerMesh;
    this.cameraSystem = cameraSystem;
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.groundRay = new Ray(Vector3.Zero(), Vector3.Down(), this.options.groundCheckDistance);

    this.scene.collisionsEnabled = true;
    this.playerMesh.checkCollisions = true;
    this.playerMesh.ellipsoid = new Vector3(0.4, 1.0, 0.4);
    this.playerMesh.ellipsoidOffset = new Vector3(0, 1.0, 0);
    this.playerMesh.rotationQuaternion = Quaternion.Identity();

    this.bindInput();
  }

  setCollisionMeshes(meshes: AbstractMesh[]): void {
    this.collisionMeshes.clear();
    for (const mesh of meshes) {
      this.collisionMeshes.add(mesh);
      mesh.checkCollisions = true;
    }
  }

  update(deltaSeconds: number): void {
    this.updateGrounded();
    this.applyJump();
    this.updateDash(deltaSeconds);
    this.updateImpulse(deltaSeconds);
    this.updateHorizontalVelocity(deltaSeconds);
    this.updateVerticalVelocity(deltaSeconds);
    this.applyMovement(deltaSeconds);
    this.updateGrounded();
    if (this.grounded) {
      this.verticalVelocity = 0;
    }
  }

  dispose(): void {
    this.unbindInputFn?.();
  }

  applyImpulse(direction: Vector3, speed: number, duration: number): void {
    if (duration <= 0) return;
    this.impulseDirection.copyFrom(direction);
    if (this.impulseDirection.lengthSquared() > 0) {
      this.impulseDirection.normalize();
    } else {
      this.impulseDirection.set(0, 0, 1);
    }
    this.impulseSpeed = speed;
    this.impulseRemaining = duration;
  }

  private bindInput(): void {
    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case "KeyW":
          this.input.forward = true;
          break;
        case "KeyS":
          this.input.back = true;
          break;
        case "KeyA":
          this.input.left = true;
          break;
        case "KeyD":
          this.input.right = true;
          break;
        case "Space":
          this.jumpQueued = true;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          this.dashQueued = true;
          break;
        default:
          break;
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case "KeyW":
          this.input.forward = false;
          break;
        case "KeyS":
          this.input.back = false;
          break;
        case "KeyA":
          this.input.left = false;
          break;
        case "KeyD":
          this.input.right = false;
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    this.unbindInputFn = () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }

  private updateGrounded(): void {
    this.groundRay.origin.copyFrom(this.playerMesh.position);
    this.groundRay.origin.y += 0.1;
    this.groundRay.direction.copyFrom(this.down);
    this.groundRay.length = this.options.groundCheckDistance;

    const hit = this.scene.pickWithRay(this.groundRay, (mesh) => this.collisionMeshes.has(mesh));
    this.grounded = !!hit?.hit;
  }

  private applyJump(): void {
    if (!this.jumpQueued) return;
    this.jumpQueued = false;
    if (!this.grounded) return;

    this.verticalVelocity = this.options.jumpSpeed;
    this.grounded = false;
  }

  private updateDash(deltaSeconds: number): void {
    if (this.dashCooldownRemaining > 0) {
      this.dashCooldownRemaining = Math.max(0, this.dashCooldownRemaining - deltaSeconds);
    }

    if (this.dashRemaining > 0) {
      this.dashRemaining = Math.max(0, this.dashRemaining - deltaSeconds);
      if (this.dashRemaining === 0) {
        this.cameraSystem.setFovMode("normal");
      }
      return;
    }

    if (!this.dashQueued) return;
    this.dashQueued = false;

    if (this.dashCooldownRemaining > 0) return;

    this.computeMoveDirection(this.dashDirection);
    if (this.dashDirection.lengthSquared() < 0.0001) {
      this.cameraSystem.getPlanarForward(this.dashDirection);
    }

    this.dashDirection.normalize();
    this.dashRemaining = this.options.dashDuration;
    this.dashCooldownRemaining = this.options.dashCooldown;
    this.cameraSystem.setFovMode("dash");
  }

  private updateImpulse(deltaSeconds: number): void {
    if (this.impulseRemaining > 0) {
      this.impulseRemaining = Math.max(0, this.impulseRemaining - deltaSeconds);
    }
  }

  private updateHorizontalVelocity(deltaSeconds: number): void {
    if (this.impulseRemaining > 0) {
      this.horizontalVelocity.copyFrom(this.impulseDirection).scaleInPlace(this.impulseSpeed);
      return;
    }
    if (this.dashRemaining > 0) {
      this.horizontalVelocity.copyFrom(this.dashDirection).scaleInPlace(this.options.dashSpeed);
      return;
    }

    const inputMagnitude = this.computeMoveDirection(this.desiredMove);
    const targetSpeed = this.options.maxRunSpeed * inputMagnitude;
    this.desiredMove.scaleInPlace(targetSpeed);

    const accel = this.grounded ? this.options.acceleration : this.options.acceleration * this.options.airControl;
    const decel = this.grounded ? this.options.deceleration : this.options.deceleration * this.options.airControl;
    const maxDelta = (inputMagnitude > 0 ? accel : decel) * deltaSeconds;

    this.tmpVector.copyFrom(this.desiredMove).subtractInPlace(this.horizontalVelocity);
    const deltaLength = this.tmpVector.length();
    if (deltaLength > maxDelta && deltaLength > 0) {
      this.tmpVector.scaleInPlace(maxDelta / deltaLength);
    }
    this.horizontalVelocity.addInPlace(this.tmpVector);

    if (inputMagnitude > 0.01) {
      const desiredYaw = Math.atan2(this.desiredMove.x, this.desiredMove.z);
      const maxYawStep = this.options.turnSpeed * deltaSeconds;
      const deltaYaw = Math.atan2(Math.sin(desiredYaw - this.facingYaw), Math.cos(desiredYaw - this.facingYaw));
      const step = Math.abs(deltaYaw) > maxYawStep ? Math.sign(deltaYaw) * maxYawStep : deltaYaw;
      this.facingYaw += step;
      Quaternion.FromEulerAnglesToRef(0, this.facingYaw, 0, this.rotationQuat);
      this.playerMesh.rotationQuaternion?.copyFrom(this.rotationQuat);
    }
  }

  private updateVerticalVelocity(deltaSeconds: number): void {
    if (this.grounded && this.verticalVelocity < 0) {
      this.verticalVelocity = 0;
      return;
    }
    this.verticalVelocity -= this.options.gravity * deltaSeconds;
  }

  private applyMovement(deltaSeconds: number): void {
    this.moveDelta.copyFrom(this.horizontalVelocity).scaleInPlace(deltaSeconds);
    this.moveDelta.y = this.verticalVelocity * deltaSeconds;
    this.playerMesh.moveWithCollisions(this.moveDelta);
  }

  private computeMoveDirection(out: Vector3): number {
    const inputX = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    const inputZ = (this.input.forward ? 1 : 0) - (this.input.back ? 1 : 0);

    if (inputX === 0 && inputZ === 0) {
      out.setAll(0);
      return 0;
    }

    this.cameraSystem.getPlanarForward(this.forward);
    this.cameraSystem.getPlanarRight(this.right);

    out.copyFrom(this.forward).scaleInPlace(inputZ).addInPlace(this.tmpVector.copyFrom(this.right).scaleInPlace(inputX));
    const length = out.length();
    if (length > 0) {
      out.scaleInPlace(1 / length);
    }
    return length > 0 ? 1 : 0;
  }
}
