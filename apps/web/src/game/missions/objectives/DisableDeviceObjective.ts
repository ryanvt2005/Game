import type { MissionContext, MissionDevice, MissionObjective } from "../MissionTypes";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export class DisableDeviceObjective implements MissionObjective {
  id: string;
  title: string;
  optional: boolean;
  status: MissionObjective["status"] = "notStarted";
  progress = 0;
  private readonly devices: MissionDevice[];
  private readonly label: string;

  constructor(id: string, title: string, devices: MissionDevice[], optional = false) {
    this.id = id;
    this.title = title;
    this.optional = optional;
    this.devices = devices;
    this.label = title;
  }

  start(): void {
    this.status = "active";
  }

  update(_deltaSeconds: number, context: MissionContext): void {
    if (this.status !== "active") return;

    if (context.input.interactPressed) {
      for (const device of this.devices) {
        if (device.isDisabled) continue;
        const distance = Vector3.Distance(device.position, context.playerPosition);
        if (distance <= device.radius) {
          device.disable();
        }
      }
    }

    const disabledCount = this.devices.filter((device) => device.isDisabled).length;
    this.progress = this.devices.length === 0 ? 1 : disabledCount / this.devices.length;
    if (disabledCount === this.devices.length) {
      this.status = "completed";
    }
  }

  getStatusText(): string {
    const disabledCount = this.devices.filter((device) => device.isDisabled).length;
    return `${this.label} (${disabledCount}/${this.devices.length})`;
  }
}
