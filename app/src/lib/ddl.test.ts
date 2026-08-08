import { describe, it, expect } from "vitest";
import { getDdlStatus } from "@/lib/ddl";

// Helper: create a date relative to "now" for deterministic tests
function daysFromNow(days: number): string {
  const d = new Date(2026, 7, 15); // 2026-08-15 as the "now" baseline
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const NOW = new Date(2026, 7, 15); // 2026-08-15

describe("getDdlStatus", () => {
  it("returns 'normal' with empty label for null DDL", () => {
    const result = getDdlStatus(null, NOW);
    expect(result.status).toBe("normal");
    expect(result.daysDiff).toBe(0);
    expect(result.label).toBe("");
  });

  it("returns 'overdue' for a past date with correct days count", () => {
    const ddl = daysFromNow(-5); // 2026-08-10, 5 days before NOW
    const result = getDdlStatus(ddl, NOW);
    expect(result.status).toBe("overdue");
    expect(result.daysDiff).toBe(-5);
    expect(result.label).toBe("已逾期 5 天");
  });

  it("returns 'overdue' for yesterday with singular label", () => {
    const ddl = daysFromNow(-1);
    const result = getDdlStatus(ddl, NOW);
    expect(result.status).toBe("overdue");
    expect(result.daysDiff).toBe(-1);
    expect(result.label).toBe("已逾期 1 天");
  });

  it("returns 'today' for the same date", () => {
    const ddl = daysFromNow(0);
    const result = getDdlStatus(ddl, NOW);
    expect(result.status).toBe("today");
    expect(result.daysDiff).toBe(0);
    expect(result.label).toBe("今天截止");
  });

  it("returns 'soon' for tomorrow (1 day remaining)", () => {
    const ddl = daysFromNow(1);
    const result = getDdlStatus(ddl, NOW);
    expect(result.status).toBe("soon");
    expect(result.daysDiff).toBe(1);
    expect(result.label).toBe("即将到期");
  });

  it("returns 'soon' for 2 days remaining", () => {
    const ddl = daysFromNow(2);
    const result = getDdlStatus(ddl, NOW);
    expect(result.status).toBe("soon");
    expect(result.daysDiff).toBe(2);
    expect(result.label).toBe("即将到期");
  });

  it("returns 'soon' for exactly 3 days remaining", () => {
    const ddl = daysFromNow(3);
    const result = getDdlStatus(ddl, NOW);
    expect(result.status).toBe("soon");
    expect(result.daysDiff).toBe(3);
    expect(result.label).toBe("即将到期");
  });

  it("returns 'normal' for 4 days remaining", () => {
    const ddl = daysFromNow(4);
    const result = getDdlStatus(ddl, NOW);
    expect(result.status).toBe("normal");
    expect(result.daysDiff).toBe(4);
    expect(result.label).toBe("");
  });

  it("handles DDL with time component (ISO timestamp)", () => {
    const ddl = "2026-08-15T23:59:59Z";
    const result = getDdlStatus(ddl, NOW);
    expect(result.status).toBe("today");
    expect(result.daysDiff).toBe(0);
  });

  it("handles DDL with time component for overdue", () => {
    const ddl = "2026-08-10T10:00:00Z";
    const result = getDdlStatus(ddl, NOW);
    expect(result.status).toBe("overdue");
    expect(result.daysDiff).toBe(-5);
  });

  it("handles DDL with time component for soon", () => {
    const ddl = "2026-08-17T10:00:00Z";
    const result = getDdlStatus(ddl, NOW);
    expect(result.status).toBe("soon");
    expect(result.daysDiff).toBe(2);
  });
});
