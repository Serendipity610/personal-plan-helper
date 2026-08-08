// ============================================================
// Tauri bridge 安全封装层 — 统一调用入口
// ============================================================
// 所有后端命令调用必须通过 safeInvoke，不得绕过此层直接依赖
// @tauri-apps/api/core 的 invoke，以防止在非 Tauri 运行环境中
// 出现未捕获的 TypeError。
// ============================================================

import { invoke as tauriInvoke } from "@tauri-apps/api/core";

/** 在非 Tauri 桌面环境中调用 bridge 时抛出的受控错误 */
export class BridgeUnavailableError extends Error {
  constructor() {
    super(
      "Tauri bridge 不可用，请在 Tauri 桌面应用中运行。" +
        "开发时请使用 npm run tauri:dev 启动，不要直接在浏览器中访问 Vite dev server。",
    );
    this.name = "BridgeUnavailableError";
  }
}

/** 检测当前运行环境是否提供可用的 Tauri IPC bridge */
function isBridgeAvailable(): boolean {
  if (typeof window === "undefined") return false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bridge = (window as any).__TAURI_INTERNALS__;
  // __TAURI_INTERNALS__ must be a truthy object whose invoke is a function.
  // Partial injection / polyfill / initialization failure can leave it
  // undefined, null, or missing the invoke method — all count as unavailable.
  return Boolean(bridge) && typeof bridge.invoke === "function";
}

/**
 * 安全调用 Tauri 后端命令。
 *
 * - bridge 不可用时抛出 {@link BridgeUnavailableError}（受控错误）
 * - bridge 可用但命令执行失败时透传原始错误
 *
 * @param cmd   Rust command 名称（如 "list_categories"）
 * @param args  可选，命令参数对象
 * @returns     命令执行结果
 */
export async function safeInvoke<T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (!isBridgeAvailable()) {
    throw new BridgeUnavailableError();
  }
  return tauriInvoke<T>(cmd, args);
}
