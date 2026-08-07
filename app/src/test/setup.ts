import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// vitest 未启用 globals，RTL 不会自动注册 afterEach，需手动清理 DOM
afterEach(() => {
  cleanup();
});

// jsdom lacks these browser APIs that Radix/dnd-kit components rely on
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? ResizeObserverStub;

globalThis.matchMedia =
  globalThis.matchMedia ??
  ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));

if (!globalThis.PointerEvent) {
  class PointerEventStub extends MouseEvent {
    constructor(type: string, params: MouseEventInit = {}) {
      super(type, params);
    }
  }
  globalThis.PointerEvent = PointerEventStub as unknown as typeof PointerEvent;
}

// Radix Select 依赖 pointer capture API，jsdom 未实现
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.setPointerCapture ??= () => {};
Element.prototype.releasePointerCapture ??= () => {};

Element.prototype.scrollIntoView ??= () => {};
