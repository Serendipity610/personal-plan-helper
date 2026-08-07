import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DndContext } from "@dnd-kit/core";
import { PlanCard } from "@/components/plans/PlanCard";
import { makePlan, makeCategory, makeTagWorkflow } from "@/test/fixtures";

const noop = vi.fn();
const category = makeCategory({ id: "cat-1", name: "工作", color: "#3B82F6" });

// Wrap in DndContext because PlanCard uses useDraggable
function renderCard(planOverrides = {}, workflowOverrides = {}) {
  const plan = makePlan(planOverrides);
  const workflow = plan.tag_workflow_id
    ? makeTagWorkflow({ id: plan.tag_workflow_id, ...workflowOverrides })
    : undefined;
  return render(
    <DndContext>
      <PlanCard
        plan={plan}
        category={category}
        workflow={workflow}
        onEdit={noop}
        onDelete={noop}
        onToggleStatus={noop}
        onStepChange={noop}
      />
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
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

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

describe("PlanCard workflow step navigation", () => {
  it("shows current step name when plan has workflow", () => {
    renderCard({ tag_workflow_id: "wf-1", current_step_index: 1 });

    expect(screen.getByText("方案设计")).toBeInTheDocument();
  });

  it("shows step index indicator", () => {
    renderCard({ tag_workflow_id: "wf-1", current_step_index: 1 });

    expect(screen.getByText(/2\s*\/\s*4/)).toBeInTheDocument();
  });

  it("renders back button disabled at first step", () => {
    renderCard({ tag_workflow_id: "wf-1", current_step_index: 0 });

    const backBtn = screen.getByLabelText(/上一步/);
    expect(backBtn).toBeDisabled();
  });

  it("renders forward button disabled at last step", () => {
    renderCard({ tag_workflow_id: "wf-1", current_step_index: 3 });

    const forwardBtn = screen.getByLabelText(/下一步/);
    expect(forwardBtn).toBeDisabled();
  });

  it("calls onStepChange with incremented index on forward click", async () => {
    const onStepChange = vi.fn();
    const plan = makePlan({ tag_workflow_id: "wf-1", current_step_index: 1 });
    const workflow = makeTagWorkflow({ id: "wf-1" });
    const user = userEvent.setup();
    render(
      <DndContext>
        <PlanCard
          plan={plan}
          category={category}
          workflow={workflow}
          onEdit={noop}
          onDelete={noop}
          onToggleStatus={noop}
          onStepChange={onStepChange}
        />
      </DndContext>,
    );

    await user.click(screen.getByLabelText("下一步"));

    expect(onStepChange).toHaveBeenCalledWith(plan, 2);
  });

  it("calls onStepChange with decremented index on back click", async () => {
    const onStepChange = vi.fn();
    const plan = makePlan({ tag_workflow_id: "wf-1", current_step_index: 2 });
    const workflow = makeTagWorkflow({ id: "wf-1" });
    const user = userEvent.setup();
    render(
      <DndContext>
        <PlanCard
          plan={plan}
          category={category}
          workflow={workflow}
          onEdit={noop}
          onDelete={noop}
          onToggleStatus={noop}
          onStepChange={onStepChange}
        />
      </DndContext>,
    );

    await user.click(screen.getByLabelText("上一步"));

    expect(onStepChange).toHaveBeenCalledWith(plan, 1);
  });

  it("does not show step navigation when plan has no workflow", () => {
    renderCard({ tag_workflow_id: null });

    expect(screen.queryByLabelText("下一步")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("上一步")).not.toBeInTheDocument();
  });

  it("does not show step navigation when workflow is undefined", () => {
    const plan = makePlan({ tag_workflow_id: "wf-missing", current_step_index: 0 });
    render(
      <DndContext>
        <PlanCard
          plan={plan}
          category={category}
          workflow={undefined}
          onEdit={noop}
          onDelete={noop}
          onToggleStatus={noop}
          onStepChange={noop}
        />
      </DndContext>,
    );

    expect(screen.queryByLabelText("下一步")).not.toBeInTheDocument();
  });
});
