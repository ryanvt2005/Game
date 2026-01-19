import type { MissionContext, MissionObjective } from "../MissionTypes";

export class DefeatEnemiesObjective implements MissionObjective {
  id: string;
  title: string;
  optional: boolean;
  status: MissionObjective["status"] = "notStarted";
  progress = 0;
  private readonly targetCount: number;
  private readonly label: string;

  constructor(id: string, title: string, targetCount: number, optional = false) {
    this.id = id;
    this.title = title;
    this.optional = optional;
    this.targetCount = targetCount;
    this.label = title;
  }

  start(): void {
    this.status = "active";
  }

  update(_deltaSeconds: number, context: MissionContext): void {
    if (this.status !== "active") return;
    const enemies = context.getActiveEnemies();
    const total = enemies.length > 0 ? Math.min(this.targetCount, enemies.length) : this.targetCount;
    const defeated = enemies.filter((enemy) => !enemy.isAlive()).length;
    this.progress = total === 0 ? 1 : Math.min(1, defeated / total);
    if (defeated >= total && total > 0) {
      this.status = "completed";
    }
  }

  getStatusText(): string {
    const enemies = this.targetCount;
    const defeated = Math.round(this.progress * enemies);
    return `${this.label} (${defeated}/${enemies})`;
  }
}
