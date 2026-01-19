import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { DefeatEnemiesObjective } from "./objectives/DefeatEnemiesObjective";
import { HoldAreaObjective } from "./objectives/HoldAreaObjective";
import { DisableDeviceObjective } from "./objectives/DisableDeviceObjective";
import { TimeLimitObjective } from "./objectives/TimeLimitObjective";
import { DamageTakenObjective } from "./objectives/DamageTakenObjective";
import type { MissionDefinition, MissionInstance, MissionContext } from "./MissionTypes";

const setupContainmentSweep = (context: MissionContext): MissionInstance => {
  context.clearEnemies();
  context.clearDevices();
  context.clearAreaMarkers();
  context.spawnEnemies("grunt", 3);
  context.spawnEnemies("bruiser", 1, ["hardened"]);
  const objectives = [
    new DefeatEnemiesObjective("defeat_wave", "Defeat all hostiles", 4),
    new TimeLimitObjective("time_limit", "Finish within time", 45, true),
  ];
  return {
    objectives,
    cleanup: () => {
      context.clearEnemies();
      context.clearDevices();
      context.clearAreaMarkers();
    },
  };
};

const setupDisableRelay = (context: MissionContext): MissionInstance => {
  context.clearEnemies();
  context.clearDevices();
  context.clearAreaMarkers();
  context.spawnEnemies("grunt", 2);
  context.spawnEnemies("controller", 1, ["adaptive"]);

  const deviceA = context.spawnDevice(new Vector3(6, 0.8, 6), 2, "relay_a");
  const deviceB = context.spawnDevice(new Vector3(-6, 0.8, -4), 2, "relay_b");
  context.spawnAreaMarker(new Vector3(0, 0, 10), 4.5, "relay_zone");

  const objectives = [
    new DisableDeviceObjective("disable_relays", "Disable relay devices", [deviceA, deviceB]),
    new HoldAreaObjective("hold_zone", "Hold the relay zone", new Vector3(0, 0, 10), 4.5, 20),
    new DamageTakenObjective("avoid_damage", "Take minimal damage", 30, true),
  ];

  return {
    objectives,
    cleanup: () => {
      context.clearEnemies();
      context.clearDevices();
      context.clearAreaMarkers();
    },
  };
};

export const missionRegistry: MissionDefinition[] = [
  {
    id: "containment_sweep",
    name: "Containment Sweep",
    description: "Clear the hostiles in the district.",
    setup: setupContainmentSweep,
  },
  {
    id: "disable_relay",
    name: "Disable the Relay",
    description: "Shut down relay devices and hold the area.",
    setup: setupDisableRelay,
  },
];
