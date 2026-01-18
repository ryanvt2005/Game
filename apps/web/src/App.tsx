import React, { useState } from "react";
import { GameCanvas } from "./game/core/GameCanvas";

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

  if (!playing) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="max-w-md w-full p-6 rounded-2xl shadow">
          <h1 className="text-2xl font-semibold mb-2">Fracture: Ascension</h1>
          <p className="opacity-80 mb-6">Single-player story prototype (Babylon.js + React)</p>
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
      <GameCanvas onHudUpdate={setHud} />
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
    </div>
  );
}
