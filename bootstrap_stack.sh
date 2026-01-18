#!/usr/bin/env bash
set -euo pipefail

# Bootstraps a React+Vite+TS+Babylon.js stack inside the current repo.
# Usage:
#   bash bootstrap_stack.sh
#
# Assumptions:
# - You are in the root of an existing GitHub repo
# - Node 20+ and npm are installed

APP_DIR="apps/web"

if [[ -d "$APP_DIR" ]]; then
  echo "==> $APP_DIR already exists; skipping Vite scaffolding."
else
  echo "==> Creating Vite React+TS app at $APP_DIR"
  mkdir -p apps
  npm create vite@latest "$APP_DIR" -- --template react-ts
fi

pushd "$APP_DIR" >/dev/null

echo "==> Installing dependencies"
npm install

# Babylon.js + loaders (glTF)
npm install @babylonjs/core @babylonjs/loaders

# Tooling
npm install -D eslint prettier eslint-config-prettier eslint-plugin-react eslint-plugin-react-hooks @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom

# Tailwind (optional but recommended for UI)
npm install -D tailwindcss postcss autoprefixer

echo "==> Writing configs and game bootstrap code"

# Tailwind config
cat > tailwind.config.js <<'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
EOF

# PostCSS config
cat > postcss.config.js <<'EOF'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
EOF

# Global styles
cat > src/index.css <<'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root { height: 100%; margin: 0; }
EOF

# Update main.tsx to import index.css
perl -0777 -i -pe 's/import\s+["'\'']\.\/index\.css["'\''];/import "\.\/index\.css";/g; s/import\s+["'\'']\.\/App\.css["'\''];\n//g' src/main.tsx || true

# Add game folder structure
mkdir -p src/game/{core,scenes,systems,entities,ui,assets}

# GameCanvas component
cat > src/game/core/GameCanvas.tsx <<'EOF'
import React, { useEffect, useRef } from "react";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";

type Props = {
  className?: string;
};

export function GameCanvas({ className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const sceneRef = useRef<Scene | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      disableWebGL2Support: false,
    });
    engineRef.current = engine;

    const scene = new Scene(engine);
    sceneRef.current = scene;

    // Light
    new HemisphericLight("light", new Vector3(0, 1, 0), scene);

    // Camera (placeholder; will be replaced by the real third-person camera system)
    const camera = new ArcRotateCamera(
      "camera",
      Math.PI / 2,
      Math.PI / 3,
      12,
      new Vector3(0, 1, 0),
      scene
    );
    camera.attachControl(canvas, true);

    // Ground + box (graybox arena starter)
    const ground = MeshBuilder.CreateGround("ground", { width: 40, height: 40 }, scene);
    ground.position.y = 0;

    const box = MeshBuilder.CreateBox("box", { size: 2 }, scene);
    box.position.y = 1;

    engine.runRenderLoop(() => {
      scene.render();
    });

    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      scene.dispose();
      engine.dispose();
      sceneRef.current = null;
      engineRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className ?? "w-full h-full block"}
      style={{ touchAction: "none" }}
    />
  );
}
EOF

# Minimal App that shows menu + game view
cat > src/App.tsx <<'EOF'
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
EOF

# ESLint config (flat config for modern eslint)
cat > eslint.config.js <<'EOF'
import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import hooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";

export default [
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      react,
      "react-hooks": hooks,
    },
    rules: {
      ...hooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
    },
    settings: { react: { version: "detect" } },
  },
  prettier,
];
EOF

# Prettier config
cat > .prettierrc <<'EOF'
{
  "semi": true,
  "singleQuote": false,
  "printWidth": 100
}
EOF

# Vitest setup
cat > vitest.config.ts <<'EOF'
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts"
  }
});
EOF

cat > vitest.setup.ts <<'EOF'
import "@testing-library/jest-dom";
EOF

# Package scripts
node - <<'EOF'
const fs = require("fs");
const path = "package.json";
const pkg = JSON.parse(fs.readFileSync(path, "utf8"));
pkg.scripts = {
  ...pkg.scripts,
  "lint": "eslint .",
  "format": "prettier --write .",
  "test": "vitest run",
  "test:watch": "vitest",
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
};
fs.writeFileSync(path, JSON.stringify(pkg, null, 2));
EOF

# GitHub Actions workflow
popd >/dev/null

mkdir -p .github/workflows
cat > .github/workflows/ci.yml <<'EOF'
name: CI

on:
  push:
    branches: ["main"]
  pull_request:

jobs:
  web:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: apps/web/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
EOF

echo "==> Done."
echo "Next:"
echo "  cd apps/web"
echo "  npm run dev"
