// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, test } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { store } from "../../store/store";
import { AlertsPanel } from "../AlertsPanel";
import { ControlPanel } from "../ControlPanel";
import { EventFeed } from "../EventFeed";
import { ErrorBoundary } from "../ErrorBoundary";

// The store ticks on a timer; pause it so every change below is one we caused.
beforeAll(() => {
  if (store.running) store.toggle();
});
afterEach(cleanup);

describe("incident flow", () => {
  test("taking a region offline opens an alert that can be acknowledged", async () => {
    const user = userEvent.setup();
    render(
      <>
        <ControlPanel />
        <AlertsPanel />
      </>,
    );
    expect(screen.getByText("No open alerts.")).toBeTruthy();

    const region = store.world.regions[1]!;
    await user.selectOptions(screen.getByLabelText("Region"), region.id);
    await user.click(screen.getByRole("button", { name: "Take offline" }));
    await user.click(screen.getByRole("button", { name: "Step 1 tick" }));

    const ack = await screen.findByRole("button", { name: new RegExp(`Acknowledge .* in ${region.name}`) });
    await user.click(ack);

    const item = screen.getAllByRole("listitem").find((li) => li.textContent?.includes(region.name))!;
    expect(within(item).getByText("acked")).toBeTruthy();
    expect(within(item).queryByRole("button")).toBeNull();
  });
});

describe("event feed", () => {
  test("filter chips expose which one is active", async () => {
    const user = userEvent.setup();
    render(<EventFeed />);
    const group = screen.getByRole("group", { name: "Filter by event kind" });
    expect(within(group).getByRole("button", { name: "all" }).getAttribute("aria-pressed")).toBe("true");

    await user.click(within(group).getByRole("button", { name: "alert" }));
    expect(within(group).getByRole("button", { name: "alert" }).getAttribute("aria-pressed")).toBe("true");
    expect(within(group).getByRole("button", { name: "all" }).getAttribute("aria-pressed")).toBe("false");
  });

  test("a search with no hits says so instead of going blank", async () => {
    const user = userEvent.setup();
    render(<EventFeed />);
    await user.type(screen.getByRole("searchbox", { name: /search events/i }), "zzz-no-such-event");
    expect(await screen.findByText("No matching events.")).toBeTruthy();
  });
});

describe("error boundary", () => {
  test("a crashing panel shows what happened and offers a retry", () => {
    const Boom = () => {
      throw new Error("no 2D context");
    };
    const quiet = console.error;
    console.error = () => {};
    try {
      render(
        <ErrorBoundary area="world map">
          <Boom />
        </ErrorBoundary>,
      );
    } finally {
      console.error = quiet;
    }
    expect(screen.getByRole("alert").textContent).toContain("world map stopped rendering: no 2D context");
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });
});
