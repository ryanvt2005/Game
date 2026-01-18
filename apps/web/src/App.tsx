import React, { useState } from "react";
import { GameCanvas } from "./game/core/GameCanvas";

export default function App() {
  const [playing, setPlaying] = useState(false);

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
    <div className="h-full">
      <GameCanvas />
      <button
        className="absolute top-4 left-4 px-3 py-2 rounded-xl border bg-white/80"
        onClick={() => setPlaying(false)}
      >
        Exit
      </button>
    </div>
  );
}
