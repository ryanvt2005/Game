import React, { useMemo, useState } from "react";
import { GameCanvas } from "./game/core/GameCanvas";
import { missionRegistry } from "./game/missions/MissionRegistry";
import type { MissionHudState } from "./game/missions/MissionTypes";

type HudState = {
  heroName: string;
  energyCurrent: number;
  energyMax: number;
  cooldowns: Record<"basic" | "ability1" | "ability2" | "ability3" | "ultimate", number>;
  ultimateCharge: number;
  ultimateReady: boolean;
  overchargeActive: boolean;
  barrierActive: boolean;
};

export default function App() {
  const [playing, setPlaying] = useState(false);
  const [hud, setHud] = useState<HudState | null>(null);
  const [missionHud, setMissionHud] = useState<MissionHudState | null>(null);
  const [missionId, setMissionId] = useState<string>(missionRegistry[0]?.id ?? "");
  const [missionRunId, setMissionRunId] = useState(0);
  const missions = useMemo(() => missionRegistry, []);

  if (!playing) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="max-w-md w-full p-6 rounded-2xl shadow">
          <h1 className="text-2xl font-semibold mb-2">Fracture: Ascension</h1>
          <p className="opacity-80 mb-6">Single-player story prototype (Babylon.js + React)</p>
          <label className="block text-sm mb-2">Mission</label>
          <select
            className="w-full border rounded-lg px-2 py-1 mb-4"
            value={missionId}
            onChange={(event) => setMissionId(event.target.value)}
          >
            {missions.map((mission) => (
              <option key={mission.id} value={mission.id}>
                {mission.name}
              </option>
            ))}
          </select>
          <button
            className="px-4 py-2 rounded-xl border"
            onClick={() => setPlaying(true)}
          >
            Start
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      <GameCanvas
        onHudUpdate={setHud}
        onMissionUpdate={setMissionHud}
        missionId={missionId}
        missionRunId={missionRunId}
      />
      <button
        className="absolute top-4 left-4 px-3 py-2 rounded-xl border bg-white/80"
        onClick={() => setPlaying(false)}
      >
        Exit
      </button>
      {hud && (
        <div className="absolute top-4 right-4 rounded-xl border bg-white/80 p-3 text-sm">
          <div className="font-semibold">{hud.heroName}</div>
          <div>Energy: {Math.round(hud.energyCurrent)}/{Math.round(hud.energyMax)}</div>
          <div>Barrier: {hud.barrierActive ? "ACTIVE" : "off"}</div>
          <div>Overcharge: {hud.overchargeActive ? "ACTIVE" : "off"}</div>
          <div className="mt-2">Q: {hud.cooldowns.ability1.toFixed(1)}s</div>
          <div>E: {hud.cooldowns.ability2.toFixed(1)}s</div>
          <div>R: {hud.cooldowns.ability3.toFixed(1)}s</div>
          <div>T: {hud.ultimateReady ? "ULT READY" : `${Math.round(hud.ultimateCharge * 100)}%`}</div>
        </div>
      )}
      {missionHud && (
        <div className="absolute bottom-4 left-4 w-80 rounded-xl border bg-white/80 p-3 text-sm">
          <div className="font-semibold">{missionHud.name}</div>
          <div className="opacity-70">Phase: {missionHud.phase}</div>
          <div className="mt-2 space-y-1">
            {missionHud.objectives.map((objective) => (
              <div key={objective.id}>
                <span>
                  {objective.status === "completed" ? "[x]" : objective.status === "failed" ? "[!]" : "[ ]"}
                </span>{" "}
                {objective.title}
                {objective.optional ? " (Optional)" : ""} — {objective.statusText}
              </div>
            ))}
          </div>
          <div className="mt-2">
            Optional: {missionHud.optionalCompleted}/{missionHud.optionalTotal}
          </div>
          {(missionHud.phase === "completed" || missionHud.phase === "failed") && (
            <div className="mt-3">
              <div className="font-semibold">{missionHud.resultText}</div>
              <button
                className="mt-2 px-3 py-1 rounded-lg border"
                onClick={() => setMissionRunId((value) => value + 1)}
              >
                Restart Mission
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
