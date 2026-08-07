import { describe, it, expect } from "vitest";
import { toPlanFormValues, validatePlanForm } from "@/lib/planForm";
import { makePlan } from "@/test/fixtures";

describe("validatePlanForm", () => {
  it("requires a non-empty title", () => {
    expect(
      validatePlanForm({
        title: "",
        description: "",
        categoryId: null,
        importance: 2,
        urgency: 2,
        ddl: null,
        periodType: null,
        periodValue: "",
      }),
    ).toEqual({ title: "标题不能为空" });
    expect(
      validatePlanForm({
        title: "   ",
        description: "",
        categoryId: null,
        importance: 2,
        urgency: 2,
        ddl: null,
        periodType: null,
        periodValue: "",
      }),
    ).toEqual({ title: "标题不能为空" });
  });

  it("accepts a valid form", () => {
    expect(
      validatePlanForm({
        title: "写周报",
        description: "",
        categoryId: null,
        importance: 2,
        urgency: 2,
        ddl: null,
        periodType: null,
        periodValue: "",
      }),
    ).toEqual({});
  });
});

describe("toPlanFormValues", () => {
  it("round-trips a plan into form values", () => {
    const plan = makePlan({
      title: "写周报",
      description: "每周五",
      category_id: "cat-1",
      importance: 3,
      urgency: 1,
      ddl: "2026-08-15T00:00:00Z",
    });
    expect(toPlanFormValues(plan)).toEqual({
      title: "写周报",
      description: "每周五",
      categoryId: "cat-1",
      importance: 3,
      urgency: 1,
      ddl: "2026-08-15",
      periodType: null,
      periodValue: "",
    });
  });
});
