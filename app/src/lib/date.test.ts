import { describe, it, expect } from "vitest";
import { formatDdl, toDateInputValue, fromDateInputValue } from "@/lib/date";

describe("formatDdl", () => {
  it("normalizes a YYYY-MM-DD string", () => {
    expect(formatDdl("2026-08-15")).toBe("2026-08-15");
  });

  it("extracts the date part from an ISO timestamp", () => {
    expect(formatDdl("2026-08-15T10:30:00Z")).toBe("2026-08-15");
  });

  it("returns an empty string for null or invalid input", () => {
    expect(formatDdl(null)).toBe("");
    expect(formatDdl("")).toBe("");
    expect(formatDdl("not-a-date")).toBe("");
  });
});

describe("toDateInputValue / fromDateInputValue", () => {
  it("converts a Date to YYYY-MM-DD in local time", () => {
    expect(toDateInputValue(new Date(2026, 7, 15))).toBe("2026-08-15");
  });

  it("parses YYYY-MM-DD as a local date", () => {
    const d = fromDateInputValue("2026-08-15");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(15);
  });
});
