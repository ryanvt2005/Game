import { render, screen } from "@testing-library/react";
import App from "./App";
import { test, expect } from "vitest";

test("renders start screen", () => {
  render(<App />);
  expect(screen.getByText("Fracture: Ascension")).toBeInTheDocument();
});
