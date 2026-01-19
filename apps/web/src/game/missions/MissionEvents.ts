import type { MissionPhase, MissionObjective } from "./MissionTypes";

type PhaseListener = (phase: MissionPhase) => void;
type ObjectiveListener = (objective: MissionObjective) => void;

export class MissionEvents {
  private readonly phaseListeners = new Set<PhaseListener>();
  private readonly objectiveCompleted = new Set<ObjectiveListener>();
  private readonly objectiveFailed = new Set<ObjectiveListener>();

  onPhaseChanged(listener: PhaseListener): () => void {
    this.phaseListeners.add(listener);
    return () => this.phaseListeners.delete(listener);
  }

  onObjectiveCompleted(listener: ObjectiveListener): () => void {
    this.objectiveCompleted.add(listener);
    return () => this.objectiveCompleted.delete(listener);
  }

  onObjectiveFailed(listener: ObjectiveListener): () => void {
    this.objectiveFailed.add(listener);
    return () => this.objectiveFailed.delete(listener);
  }

  emitPhaseChanged(phase: MissionPhase): void {
    for (const listener of this.phaseListeners) {
      listener(phase);
    }
  }

  emitObjectiveCompleted(objective: MissionObjective): void {
    for (const listener of this.objectiveCompleted) {
      listener(objective);
    }
  }

  emitObjectiveFailed(objective: MissionObjective): void {
    for (const listener of this.objectiveFailed) {
      listener(objective);
    }
  }
}
