import { describe, it, expect } from "vitest";
import { parseQuickCaptureInput, PRIORITY_TAGS } from "@/lib/quickCapture";

const SAMPLE_CATEGORIES = [
  { id: "cat-work", name: "工作计划" },
  { id: "cat-study", name: "学习计划" },
  { id: "cat-daily", name: "日常计划" },
  { id: "cat-personal", name: "个人任务" },
];

describe("parseQuickCaptureInput", () => {
  // ── Plain title (no parsing) ──────────────────────────────

  it("returns plain title unchanged when there is no separator or tag", () => {
    const result = parseQuickCaptureInput("写周报", SAMPLE_CATEGORIES);
    expect(result).toEqual({
      categoryId: null,
      priority: null,
      title: "写周报",
    });
  });

  it("trims whitespace from a plain title", () => {
    const result = parseQuickCaptureInput("  整理文档  ", SAMPLE_CATEGORIES);
    expect(result).toEqual({
      categoryId: null,
      priority: null,
      title: "整理文档",
    });
  });

  it("returns empty title for empty input", () => {
    const result = parseQuickCaptureInput("", SAMPLE_CATEGORIES);
    expect(result).toEqual({
      categoryId: null,
      priority: null,
      title: "",
    });
  });

  it("returns empty title for whitespace-only input", () => {
    const result = parseQuickCaptureInput("   ", SAMPLE_CATEGORIES);
    expect(result).toEqual({
      categoryId: null,
      priority: null,
      title: "",
    });
  });

  // ── Category extraction (before ：) ────────────────────────

  it("extracts a known category from before the fullwidth colon", () => {
    const result = parseQuickCaptureInput("工作计划：写周报", SAMPLE_CATEGORIES);
    expect(result).toEqual({
      categoryId: "cat-work",
      priority: null,
      title: "写周报",
    });
  });

  it("treats the entire input as title when the category prefix is unknown", () => {
    const result = parseQuickCaptureInput("不存在的分类：测试计划", SAMPLE_CATEGORIES);
    expect(result).toEqual({
      categoryId: null,
      priority: null,
      title: "不存在的分类：测试计划",
    });
  });

  it("only splits on the first fullwidth colon", () => {
    const result = parseQuickCaptureInput("工作计划：重要：次要任务", SAMPLE_CATEGORIES);
    expect(result).toEqual({
      categoryId: "cat-work",
      priority: null,
      title: "重要：次要任务",
    });
  });

  it("handles category name with exact match (case-sensitive)", () => {
    // Category names are matched exactly — no case folding
    const result = parseQuickCaptureInput("工作计划：写报告", SAMPLE_CATEGORIES);
    expect(result.categoryId).toBe("cat-work");
  });

  it("rejects a partial category name match (工作计划 vs 工作)", () => {
    const cats = [{ id: "cat-work", name: "工作" }];
    const result = parseQuickCaptureInput("工作计划：写报告", cats);
    // "工作计划" does not exactly match "工作"
    expect(result.categoryId).toBeNull();
    expect(result.title).toBe("工作计划：写报告");
  });

  // ── Priority tag extraction (【...】) ──────────────────────

  it("extracts 重要紧急 priority tag from the input", () => {
    const result = parseQuickCaptureInput("【重要紧急】写周报", SAMPLE_CATEGORIES);
    expect(result).toEqual({
      categoryId: null,
      priority: { importance: 3, urgency: 3 },
      title: "写周报",
    });
  });

  it("extracts 重要不紧急 priority tag", () => {
    const result = parseQuickCaptureInput("【重要不紧急】写文档", SAMPLE_CATEGORIES);
    expect(result).toEqual({
      categoryId: null,
      priority: { importance: 3, urgency: 1 },
      title: "写文档",
    });
  });

  it("extracts 不重要紧急 priority tag", () => {
    const result = parseQuickCaptureInput("【不重要紧急】修bug", SAMPLE_CATEGORIES);
    expect(result).toEqual({
      categoryId: null,
      priority: { importance: 1, urgency: 3 },
      title: "修bug",
    });
  });

  it("extracts 不重要不紧急 priority tag", () => {
    const result = parseQuickCaptureInput("【不重要不紧急】整理文件", SAMPLE_CATEGORIES);
    expect(result).toEqual({
      categoryId: null,
      priority: { importance: 1, urgency: 1 },
      title: "整理文件",
    });
  });

  it("falls back the full input when priority tag is unknown", () => {
    const result = parseQuickCaptureInput("【紧急不重要】分析3d模型加载bug", SAMPLE_CATEGORIES);
    expect(result).toEqual({
      categoryId: null,
      priority: null,
      title: "【紧急不重要】分析3d模型加载bug",
    });
  });

  it("falls back priority tag but keeps extracted category", () => {
    const result = parseQuickCaptureInput(
      "工作计划：【紧急不重要】分析3d模型加载bug",
      SAMPLE_CATEGORIES,
    );
    // Category is extracted, but priority tag is unknown → title preserves the full body
    expect(result).toEqual({
      categoryId: "cat-work",
      priority: null,
      title: "【紧急不重要】分析3d模型加载bug",
    });
  });

  it("does not extract priority tag when it appears in the middle of text", () => {
    // Only extract 【...】 that is at the start (possibly after category：)
    const result = parseQuickCaptureInput("关于【重要紧急】的讨论", SAMPLE_CATEGORIES);
    expect(result).toEqual({
      categoryId: null,
      priority: null,
      title: "关于【重要紧急】的讨论",
    });
  });

  // ── Combined category + priority ───────────────────────────

  it("extracts both category and priority when both are present", () => {
    const result = parseQuickCaptureInput(
      "学习计划：【重要不紧急】复习期末考试",
      SAMPLE_CATEGORIES,
    );
    expect(result).toEqual({
      categoryId: "cat-study",
      priority: { importance: 3, urgency: 1 },
      title: "复习期末考试",
    });
  });

  it("handles category + priority with 日常计划", () => {
    const result = parseQuickCaptureInput(
      "日常计划：【不重要不紧急】打扫卫生",
      SAMPLE_CATEGORIES,
    );
    expect(result).toEqual({
      categoryId: "cat-daily",
      priority: { importance: 1, urgency: 1 },
      title: "打扫卫生",
    });
  });

  // ── Edge cases ─────────────────────────────────────────────

  it("returns empty title when only priority tag is provided", () => {
    const result = parseQuickCaptureInput("【重要紧急】", SAMPLE_CATEGORIES);
    expect(result).toEqual({
      categoryId: null,
      priority: { importance: 3, urgency: 3 },
      title: "",
    });
  });

  it("preserves whitespace around the actual title", () => {
    const result = parseQuickCaptureInput("工作计划：  整理文档  ", SAMPLE_CATEGORIES);
    expect(result).toEqual({
      categoryId: "cat-work",
      priority: null,
      title: "整理文档",
    });
  });

  it("handles input with only a category prefix and no body", () => {
    const result = parseQuickCaptureInput("工作计划：", SAMPLE_CATEGORIES);
    expect(result).toEqual({
      categoryId: "cat-work",
      priority: null,
      title: "",
    });
  });

  it("returns null categoryId when categories list is empty", () => {
    const result = parseQuickCaptureInput("工作计划：写周报", []);
    expect(result).toEqual({
      categoryId: null,
      priority: null,
      title: "工作计划：写周报",
    });
  });

  // ── Spacing between separators ───────────────────────────

  it("parses priority tag when space separates colon and tag", () => {
    const result = parseQuickCaptureInput(
      "工作计划： 【重要紧急】写周报",
      SAMPLE_CATEGORIES,
    );
    expect(result).toEqual({
      categoryId: "cat-work",
      priority: { importance: 3, urgency: 3 },
      title: "写周报",
    });
  });

  it("parses priority tag when multiple spaces separate colon and tag", () => {
    const result = parseQuickCaptureInput(
      "工作计划：   【重要不紧急】写周报",
      SAMPLE_CATEGORIES,
    );
    expect(result).toEqual({
      categoryId: "cat-work",
      priority: { importance: 3, urgency: 1 },
      title: "写周报",
    });
  });

  it("parses priority tag with spaces before it even without category prefix", () => {
    const result = parseQuickCaptureInput("  【不重要紧急】修bug", SAMPLE_CATEGORIES);
    expect(result).toEqual({
      categoryId: null,
      priority: { importance: 1, urgency: 3 },
      title: "修bug",
    });
  });
});

describe("PRIORITY_TAGS", () => {
  it("contains exactly four priority labels", () => {
    expect(Object.keys(PRIORITY_TAGS)).toHaveLength(4);
  });

  it("maps each priority tag to a valid importance/urgency pair", () => {
    for (const [label, point] of Object.entries(PRIORITY_TAGS)) {
      expect(label).toBeTruthy();
      expect(point.importance).toBeGreaterThanOrEqual(0);
      expect(point.importance).toBeLessThanOrEqual(4);
      expect(point.urgency).toBeGreaterThanOrEqual(0);
      expect(point.urgency).toBeLessThanOrEqual(4);
    }
  });

  it("maps 重要紧急 to high importance and high urgency", () => {
    expect(PRIORITY_TAGS["重要紧急"]).toEqual({ importance: 3, urgency: 3 });
  });

  it("maps 重要不紧急 to high importance and low urgency", () => {
    expect(PRIORITY_TAGS["重要不紧急"]).toEqual({ importance: 3, urgency: 1 });
  });

  it("maps 不重要紧急 to low importance and high urgency", () => {
    expect(PRIORITY_TAGS["不重要紧急"]).toEqual({ importance: 1, urgency: 3 });
  });

  it("maps 不重要不紧急 to low importance and low urgency", () => {
    expect(PRIORITY_TAGS["不重要不紧急"]).toEqual({ importance: 1, urgency: 1 });
  });
});
