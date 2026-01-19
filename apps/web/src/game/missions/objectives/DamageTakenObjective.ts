import type { MissionContext, MissionObjective } from "../MissionTypes";

export class DamageTakenObjective implements MissionObjective {
  id: string;
  title: string;
  optional: boolean;
  status: MissionObjective["status"] = "notStarted";
  progress = 1;
  private readonly maxDamage: number;
  private baselineHealth = 0;

  constructor(id: string, title: string, maxDamage: number, optional = true) {
    this.id = id;
    this.title = title;
    this.optional = optional;
    this.maxDamage = maxDamage;
  }

  start(): void {
    this.status = "active";
  }

  update(_deltaSeconds: number, context: MissionContext): void {
    if (this.status !== "active") return;
    if (this.baselineHealth === 0) {
      this.baselineHealth = context.playerHealth.current;
    }
    const damageTaken = Math.max(0, this.baselineHealth - context.playerHealth.current);
    this.progress = this.maxDamage === 0 ? 1 : Math.max(0, 1 - damageTaken / this.maxDamage);
    if (damageTaken > this.maxDamage) {
      this.status = "failed";
    }
  }

  getStatusText(): string {
    return `${this.title}`;
  }
}
