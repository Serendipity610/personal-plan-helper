import { describe, it, expect } from "vitest";
import {
  timeRangeBounds,
  planMatchesTimeRange,
  filterPlans,
  sortPlans,
  type PlanFilters,
} from "@/lib/filters";
import { makePlan } from "@/test/fixtures";

// 2026-08-07 是周五，本地时区 15:30
const NOW = new Date(2026, 7, 7, 15, 30, 0);

describe("timeRangeBounds", () => {
  it("returns null for the all range", () => {
    expect(timeRangeBounds("all", NOW)).toBeNull();
  });

  it("computes today bounds", () => {
    expect(timeRangeBounds("today", NOW)).toEqual({
      start: new Date(2026, 7, 7),
      end: new Date(2026, 7, 8),
    });
  });

  it("computes week bounds starting Monday", () => {
    expect(timeRangeBounds("week", NOW)).toEqual({
      start: new Date(2026, 7, 3),
      end: new Date(2026, 7, 10),
    });
  });

  it("computes month bounds", () => {
    expect(timeRangeBounds("month", NOW)).toEqual({
      start: new Date(2026, 7, 1),
      end: new Date(2026, 8, 1),
    });
  });

  it("computes quarter bounds", () => {
    expect(timeRangeBounds("quarter", NOW)).toEqual({
      start: new Date(2026, 6, 1),
      end: new Date(2026, 9, 1),
    });
  });

  it("computes year bounds", () => {
    expect(timeRangeBounds("year", NOW)).toEqual({
      start: new Date(2026, 0, 1),
      end: new Date(2027, 0, 1),
    });
  });
});

describe("planMatchesTimeRange", () => {
  it("matches a plan whose ddl falls inside today", () => {
    expect(planMatchesTimeRange(makePlan({ ddl: "2026-08-07" }), "today", NOW)).toBe(true);
  });

  it("rejects a plan whose ddl is outside today", () => {
    expect(planMatchesTimeRange(makePlan({ ddl: "2026-08-06" }), "today", NOW)).toBe(false);
  });

  it("rejects a plan without a ddl for concrete ranges", () => {
    expect(planMatchesTimeRange(makePlan({ ddl: null }), "today", NOW)).toBe(false);
  });

  it("accepts every plan for the all range", () => {
    expect(planMatchesTimeRange(makePlan({ ddl: null }), "all", NOW)).toBe(true);
  });

  it("matches plans due inside the week", () => {
    expect(planMatchesTimeRange(makePlan({ ddl: "2026-08-05" }), "week", NOW)).toBe(true);
    expect(planMatchesTimeRange(makePlan({ ddl: "2026-08-10" }), "week", NOW)).toBe(false);
  });
});

describe("filterPlans", () => {
  const plans = [
    makePlan({ id: "a", category_id: "c1", status: "active", ddl: "2026-08-07" }),
    makePlan({ id: "b", category_id: "c2", status: "completed", ddl: "2026-08-07" }),
    makePlan({ id: "c", category_id: "c1", status: "active", ddl: null }),
    makePlan({ id: "d", category_id: "c1", status: "cancelled", ddl: "2026-08-01" }),
  ];
  const all: PlanFilters = { categoryId: null, status: "all", timeRange: "all" };

  it("passes everything through when no filter is set", () => {
    expect(filterPlans(plans, all, NOW).map((p) => p.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("filters by category id", () => {
    expect(filterPlans(plans, { ...all, categoryId: "c1" }, NOW).map((p) => p.id)).toEqual([
      "a",
      "c",
      "d",
    ]);
  });

  it("filters by status", () => {
    expect(filterPlans(plans, { ...all, status: "completed" }, NOW).map((p) => p.id)).toEqual([
      "b",
    ]);
  });

  it("filters by time range using ddl", () => {
    expect(filterPlans(plans, { ...all, timeRange: "today" }, NOW).map((p) => p.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("combines category, status and time range filters", () => {
    expect(
      filterPlans(plans, { categoryId: "c1", status: "active", timeRange: "today" }, NOW).map(
        (p) => p.id,
      ),
    ).toEqual(["a"]);
  });
});

describe("sortPlans", () => {
  const plans = [
    makePlan({
      id: "a",
      importance: 3,
      urgency: 1,
      ddl: "2026-08-10",
      created_at: "2026-08-01T00:00:00Z",
    }),
    makePlan({ id: "b", importance: 1, urgency: 4, ddl: null, created_at: "2026-08-03T00:00:00Z" }),
    makePlan({
      id: "c",
      importance: 2,
      urgency: 2,
      ddl: "2026-08-05",
      created_at: "2026-08-02T00:00:00Z",
    }),
  ];

  it("sorts by importance descending then ascending", () => {
    expect(sortPlans(plans, "importance", "desc").map((p) => p.id)).toEqual(["a", "c", "b"]);
    expect(sortPlans(plans, "importance", "asc").map((p) => p.id)).toEqual(["b", "c", "a"]);
  });

  it("sorts by urgency", () => {
    expect(sortPlans(plans, "urgency", "desc").map((p) => p.id)).toEqual(["b", "c", "a"]);
  });

  it("sorts by created_at", () => {
    expect(sortPlans(plans, "created_at", "asc").map((p) => p.id)).toEqual(["a", "c", "b"]);
    expect(sortPlans(plans, "created_at", "desc").map((p) => p.id)).toEqual(["b", "c", "a"]);
  });

  it("keeps plans without a ddl last in both directions", () => {
    expect(sortPlans(plans, "ddl", "asc").map((p) => p.id)).toEqual(["c", "a", "b"]);
    expect(sortPlans(plans, "ddl", "desc").map((p) => p.id)).toEqual(["a", "c", "b"]);
  });
});
