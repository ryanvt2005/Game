import type { MissionContext, MissionObjective } from "../MissionTypes";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export class HoldAreaObjective implements MissionObjective {
  id: string;
  title: string;
  optional: boolean;
  status: MissionObjective["status"] = "notStarted";
  progress = 0;
  private readonly center: Vector3;
  private readonly radius: number;
  private readonly holdSeconds: number;
  private timer = 0;
  private readonly label: string;

  constructor(id: string, title: string, center: Vector3, radius: number, holdSeconds: number, optional = false) {
    this.id = id;
    this.title = title;
    this.optional = optional;
    this.center = center.clone();
    this.radius = radius;
    this.holdSeconds = holdSeconds;
    this.label = title;
  }

  start(): void {
    this.status = "active";
  }

  update(deltaSeconds: number, context: MissionContext): void {
    if (this.status !== "active") return;
    const distance = Vector3.Distance(this.center, context.playerPosition);
    if (distance <= this.radius) {
      this.timer = Math.min(this.holdSeconds, this.timer + deltaSeconds);
    }
    this.progress = this.holdSeconds === 0 ? 1 : Math.min(1, this.timer / this.holdSeconds);
    if (this.timer >= this.holdSeconds) {
      this.status = "completed";
    }
  }

  getStatusText(): string {
    return `${this.label} (${Math.round(this.timer)} / ${Math.round(this.holdSeconds)}s)`;
  }
}
