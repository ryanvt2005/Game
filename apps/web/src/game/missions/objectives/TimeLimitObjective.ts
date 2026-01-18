import type { MissionContext, MissionObjective } from "../MissionTypes";

export class TimeLimitObjective implements MissionObjective {
  id: string;
  title: string;
  optional: boolean;
  status: MissionObjective["status"] = "notStarted";
  progress = 1;
  private readonly duration: number;
  private timer = 0;
  private readonly label: string;

  constructor(id: string, title: string, duration: number, optional = false) {
    this.id = id;
    this.title = title;
    this.optional = optional;
    this.duration = duration;
    this.label = title;
  }

  start(): void {
    this.status = "active";
  }

  update(deltaSeconds: number, _context: MissionContext): void {
    if (this.status !== "active") return;
    this.timer = Math.min(this.duration, this.timer + deltaSeconds);
    this.progress = this.duration === 0 ? 1 : 1 - Math.min(1, this.timer / this.duration);
    if (this.timer >= this.duration) {
      this.status = "failed";
    }
  }

  getStatusText(): string {
    const remaining = Math.max(0, this.duration - this.timer);
    return `${this.label} (${remaining.toFixed(0)}s left)`;
  }
}
