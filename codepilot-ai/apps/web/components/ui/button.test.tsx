import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { Button } from "./button";

it("renders supplied button text and attributes", () => {
  render(<Button disabled>Start</Button>);
  expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
});

