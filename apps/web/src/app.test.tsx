import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./app";

describe("App", () => {
  it("renders the application name", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "HomeGround" })).toBeInTheDocument();
  });

  it("gives the saved properties column an accessible name", () => {
    render(<App />);

    expect(screen.getByRole("complementary", { name: "Saved properties" })).toBeInTheDocument();
  });

  it("does not render the right panel until something needs it", () => {
    render(<App />);

    expect(screen.getAllByRole("complementary")).toHaveLength(1);
  });
});
