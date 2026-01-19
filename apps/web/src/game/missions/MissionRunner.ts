import type {
  MissionContext,
  MissionDefinition,
  MissionHudState,
  MissionInstance,
  MissionObjective,
  MissionPhase,
  ObjectiveView,
} from "./MissionTypes";
import { MissionEvents } from "./MissionEvents";

export class MissionRunner {
  private readonly context: MissionContext;
  private readonly registry: MissionDefinition[];
  private currentMission: MissionDefinition | null = null;
  private currentInstance: MissionInstance | null = null;
  private objectives: MissionObjective[] = [];
  private phase: MissionPhase = "briefing";
  private resultText: string | undefined;
  readonly events = new MissionEvents();

  constructor(context: MissionContext, registry: MissionDefinition[]) {
    this.context = context;
    this.registry = registry;
  }

  startMission(id: string): void {
    const mission = this.registry.find((entry) => entry.id === id);
    if (!mission) return;

    this.currentInstance?.cleanup();
    this.currentMission = mission;
    this.phase = "briefing";
    this.events.emitPhaseChanged(this.phase);
    this.context.clearEnemies();
    this.context.clearDevices();
    this.context.clearAreaMarkers();
    this.context.playerHealth.current = this.context.playerHealth.max;

    this.currentInstance = mission.setup(this.context);
    this.objectives = this.currentInstance.objectives;
    for (const objective of this.objectives) {
      objective.start();
    }
    this.phase = "inProgress";
    this.events.emitPhaseChanged(this.phase);
    this.resultText = undefined;
  }

  update(deltaSeconds: number): void {
    if (!this.currentMission) return;
    if (this.phase !== "inProgress") return;

    const playerDead = this.context.playerHealth.current <= 0;
    if (playerDead) {
      this.failMission("Mission Failed: Player Down");
      return;
    }

    for (const objective of this.objectives) {
      if (objective.status === "completed" || objective.status === "failed") continue;
      objective.update(deltaSeconds, this.context);
      if (objective.status === "completed") {
        this.events.emitObjectiveCompleted(objective);
      }
      if (objective.status === "failed") {
        this.events.emitObjectiveFailed(objective);
      }
    }

    const requiredObjectives = this.objectives.filter((obj) => !obj.optional);
    const requiredFailed = requiredObjectives.some((obj) => obj.status === "failed");
    if (requiredFailed) {
      this.failMission("Mission Failed");
      return;
    }

    const requiredComplete = requiredObjectives.every((obj) => obj.status === "completed");
    if (requiredComplete) {
      this.completeMission("Mission Complete");
    }
  }

  getPhase(): MissionPhase {
    return this.phase;
  }

  setInteractPressed(value: boolean): void {
    this.context.input.interactPressed = value;
  }

  consumeInteract(): void {
    this.context.input.interactPressed = false;
  }

  getHudState(): MissionHudState | null {
    if (!this.currentMission) return null;
    const objectiveViews: ObjectiveView[] = this.objectives.map((objective) => ({
      id: objective.id,
      title: objective.title,
      optional: objective.optional,
      status: objective.status,
      progress: objective.progress,
      statusText: objective.getStatusText(),
    }));
    const optionalObjectives = this.objectives.filter((obj) => obj.optional);
    const optionalCompleted = optionalObjectives.filter((obj) => obj.status === "completed").length;
    return {
      id: this.currentMission.id,
      name: this.currentMission.name,
      phase: this.phase,
      objectives: objectiveViews,
      optionalCompleted,
      optionalTotal: optionalObjectives.length,
      resultText: this.resultText,
    };
  }

  private completeMission(text: string): void {
    this.phase = "completed";
    this.resultText = text;
    this.events.emitPhaseChanged(this.phase);
  }

  private failMission(text: string): void {
    this.phase = "failed";
    this.resultText = text;
    this.events.emitPhaseChanged(this.phase);
  }
}
