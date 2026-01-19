import type { Vector3 } from "@babylonjs/core/Maths/math.vector";

export type MissionPhase = "briefing" | "inProgress" | "completed" | "failed";

export type ObjectiveStatus = "notStarted" | "active" | "completed" | "failed";

export type ObjectiveView = {
  id: string;
  title: string;
  optional: boolean;
  status: ObjectiveStatus;
  progress: number;
  statusText: string;
};

export type MissionHudState = {
  id: string;
  name: string;
  phase: MissionPhase;
  objectives: ObjectiveView[];
  optionalCompleted: number;
  optionalTotal: number;
  resultText?: string;
};

export type MissionObjective = {
  id: string;
  title: string;
  optional: boolean;
  status: ObjectiveStatus;
  progress: number;
  start: () => void;
  update: (deltaSeconds: number, context: MissionContext) => void;
  getStatusText: () => string;
};

export type MissionDefinition = {
  id: string;
  name: string;
  description: string;
  setup: (context: MissionContext) => MissionInstance;
};

export type MissionInstance = {
  objectives: MissionObjective[];
  cleanup: () => void;
};

export type MissionContext = {
  scene: unknown;
  playerPosition: Vector3;
  playerHealth: { max: number; current: number };
  input: {
    interactPressed: boolean;
  };
  spawnDevice: (position: Vector3, radius: number, id: string) => MissionDevice;
  clearDevices: () => void;
  spawnAreaMarker: (position: Vector3, radius: number, id: string) => void;
  clearAreaMarkers: () => void;
  spawnEnemies: (archetype: "grunt" | "bruiser" | "controller", count: number, modifiers?: string[]) => void;
  getActiveEnemies: () => MissionEnemyRef[];
  clearEnemies: () => void;
};

export type MissionDevice = {
  id: string;
  position: Vector3;
  radius: number;
  isDisabled: boolean;
  disable: () => void;
};

export type MissionEnemyRef = {
  id: string;
  isAlive: () => boolean;
};
