import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { PlanCard } from "@/components/plans/PlanCard";
import { makePlan, makeCategory } from "@/test/fixtures";

const noop = vi.fn();
const category = makeCategory({ id: "cat-1", name: "工作", color: "#3B82F6" });

// Wrap in DndContext because PlanCard uses useDraggable
function renderCard(planOverrides = {}) {
  const plan = makePlan(planOverrides);
  return render(
    <DndContext>
      <PlanCard plan={plan} category={category} onEdit={noop} onDelete={noop} onToggleStatus={noop} />
    </DndContext>,
  );
}

describe("PlanCard DDL display", () => {
  it("shows overdue badge for past DDL", () => {
    // DDL 5 days in the past relative to "now"
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    const ddl = pastDate.toISOString().slice(0, 10);

    renderCard({ ddl });

    // Should show overdue badge
    expect(screen.getByText(/已逾期/)).toBeInTheDocument();
  });

  it("shows today badge for today DDL", () => {
    const today = new Date().toISOString().slice(0, 10);

    renderCard({ ddl: today });

    expect(screen.getByText("今天截止")).toBeInTheDocument();
  });

  it("shows soon badge for DDL within 3 days", () => {
    const soonDate = new Date();
    soonDate.setDate(soonDate.getDate() + 2);
    const ddl = soonDate.toISOString().slice(0, 10);

    renderCard({ ddl });

    expect(screen.getByText("即将到期")).toBeInTheDocument();
  });

  it("does not show badge for DDL beyond 3 days", () => {
    const farDate = new Date();
    farDate.setDate(farDate.getDate() + 10);
    const ddl = farDate.toISOString().slice(0, 10);

    renderCard({ ddl });

    expect(screen.queryByText("今天截止")).not.toBeInTheDocument();
    expect(screen.queryByText(/已逾期/)).not.toBeInTheDocument();
    expect(screen.queryByText("即将到期")).not.toBeInTheDocument();
  });

  it("does not show badge when DDL is null", () => {
    renderCard({ ddl: null });

    expect(screen.queryByText("今天截止")).not.toBeInTheDocument();
    expect(screen.queryByText(/已逾期/)).not.toBeInTheDocument();
    expect(screen.queryByText("即将到期")).not.toBeInTheDocument();
  });

  it("still shows the DDL date string alongside the badge", () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    const y = pastDate.getFullYear();
    const m = String(pastDate.getMonth() + 1).padStart(2, "0");
    const d = String(pastDate.getDate()).padStart(2, "0");
    const ddl = `${y}-${m}-${d}`;

    renderCard({ ddl });

    // Date text should still be visible
    expect(screen.getByText(ddl)).toBeInTheDocument();
    // Overdue badge should appear
    expect(screen.getByText(/已逾期/)).toBeInTheDocument();
  });
});
