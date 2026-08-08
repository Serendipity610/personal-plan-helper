import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mock for @tauri-apps/api/core ──────────────────
const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mockInvoke,
}));

import { safeInvoke, BridgeUnavailableError } from "@/lib/bridge";

// ── Helpers ─────────────────────────────────────────────────
function setBridgeAvailable() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__TAURI_INTERNALS__ = { invoke: mockInvoke };
}

function setBridgeUnavailable() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).__TAURI_INTERNALS__;
}

beforeEach(() => {
  vi.clearAllMocks();
  setBridgeUnavailable();
});

// ── Tests ───────────────────────────────────────────────────

describe("safeInvoke", () => {
  it("calls real invoke and returns its result when bridge is available", async () => {
    setBridgeAvailable();
    const expected = [{ id: "1", name: "test" }];
    mockInvoke.mockResolvedValue(expected);

    const result = await safeInvoke("list_categories");

    expect(result).toEqual(expected);
    expect(mockInvoke).toHaveBeenCalledWith("list_categories", undefined);
  });

  it("passes args through to invoke when bridge is available", async () => {
    setBridgeAvailable();
    mockInvoke.mockResolvedValue({ id: "created" });

    await safeInvoke("create_category", {
      request: { name: "新分类", color: "#ff0000" },
    });

    expect(mockInvoke).toHaveBeenCalledWith("create_category", {
      request: { name: "新分类", color: "#ff0000" },
    });
  });

  it("throws BridgeUnavailableError when bridge is not available", async () => {
    // Bridge is unavailable by default (setup clears __TAURI_INTERNALS__)
    await expect(safeInvoke("list_categories")).rejects.toThrow(
      BridgeUnavailableError,
    );
  });

  it("throws BridgeUnavailableError with diagnostic message when bridge is unavailable", async () => {
    await expect(safeInvoke("list_categories")).rejects.toThrow(
      /Tauri bridge 不可用/,
    );
  });

  it("does NOT throw raw TypeError when bridge is unavailable", async () => {
    try {
      await safeInvoke("list_categories");
    } catch (e) {
      expect(e).toBeInstanceOf(BridgeUnavailableError);
      expect(e).not.toBeInstanceOf(TypeError);
    }
  });

  it("propagates errors from invoke when bridge is available", async () => {
    setBridgeAvailable();
    const dbError = new Error("database is locked");
    mockInvoke.mockRejectedValue(dbError);

    await expect(safeInvoke("list_categories")).rejects.toThrow(
      "database is locked",
    );
  });

  it("does not swallow invoke rejection details", async () => {
    setBridgeAvailable();
    mockInvoke.mockRejectedValue("Rust command failed: duplicate key");

    await expect(safeInvoke("create_category")).rejects.toBe(
      "Rust command failed: duplicate key",
    );
  });

  it("returns result for arg-less command when bridge is available", async () => {
    setBridgeAvailable();
    mockInvoke.mockResolvedValue([]);

    const result = await safeInvoke("list_categories");

    expect(result).toEqual([]);
  });
});

describe("BridgeUnavailableError", () => {
  it("has name BridgeUnavailableError", () => {
    const err = new BridgeUnavailableError();
    expect(err.name).toBe("BridgeUnavailableError");
  });

  it("is an instance of Error", () => {
    const err = new BridgeUnavailableError();
    expect(err).toBeInstanceOf(Error);
  });
});
