import { describe, it, expect } from "vitest";
import {
  QUADRANT_THRESHOLD,
  getQuadrant,
  getQuadrantPoint,
  resolveQuadrantDrop,
} from "@/lib/quadrant";
import type { Quadrant } from "@/types";
import { makePlan } from "@/test/fixtures";

describe("getQuadrant", () => {
  it("maps each region to the correct quadrant", () => {
    expect(getQuadrant(3, 3)).toBe("q1"); // 重要紧急
    expect(getQuadrant(3, 1)).toBe("q2"); // 重要不紧急
    expect(getQuadrant(1, 3)).toBe("q3"); // 不重要紧急
    expect(getQuadrant(1, 1)).toBe("q4"); // 不重要不紧急
    expect(getQuadrant(0, 0)).toBe("q4");
    expect(getQuadrant(4, 4)).toBe("q1");
  });

  it("uses 2.5 as the boundary for both axes", () => {
    expect(QUADRANT_THRESHOLD).toBe(2.5);
    // exactly at threshold counts as 重要/紧急
    expect(getQuadrant(2.5, 2.5)).toBe("q1");
    expect(getQuadrant(2.5, 2)).toBe("q2");
    expect(getQuadrant(2, 2.5)).toBe("q3");
    expect(getQuadrant(2, 2)).toBe("q4");
    // just below the threshold flips the region
    expect(getQuadrant(2.49, 3)).toBe("q3");
    expect(getQuadrant(3, 2.49)).toBe("q2");
  });
});

describe("getQuadrantPoint", () => {
  it("returns a point that maps back to the source quadrant", () => {
    const quadrants: Quadrant[] = ["q1", "q2", "q3", "q4"];
    for (const q of quadrants) {
      const { importance, urgency } = getQuadrantPoint(q);
      expect(getQuadrant(importance, urgency)).toBe(q);
    }
  });

  it("picks representative values on the dominant side of the threshold", () => {
    expect(getQuadrantPoint("q1")).toEqual({ importance: 3, urgency: 3 });
    expect(getQuadrantPoint("q2")).toEqual({ importance: 3, urgency: 1 });
    expect(getQuadrantPoint("q3")).toEqual({ importance: 1, urgency: 3 });
    expect(getQuadrantPoint("q4")).toEqual({ importance: 1, urgency: 1 });
  });
});

describe("resolveQuadrantDrop", () => {
  it("returns new importance/urgency when the target quadrant differs", () => {
    const plan = makePlan({ importance: 3, urgency: 3 }); // q1
    const result = resolveQuadrantDrop(plan, "q4");
    expect(result).toEqual({ importance: 1, urgency: 1 });
  });

  it("returns null when dropped into the same quadrant", () => {
    const plan = makePlan({ importance: 3, urgency: 3 });
    expect(resolveQuadrantDrop(plan, "q1")).toBeNull();
  });

  it("returns null when the drop target is invalid", () => {
    const plan = makePlan({ importance: 1, urgency: 1 });
    expect(resolveQuadrantDrop(plan, null)).toBeNull();
  });
});
