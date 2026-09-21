import { vi } from "vitest";
import { fireEvent } from "@testing-library/react";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const testIdRects = new Map<string, Rect>();
const elementRects = new Map<Element, Rect>();
let overlayRect: Rect | null = null;
let rectSpy: ReturnType<typeof vi.spyOn> | null = null;

function toDomRect(rect: Rect): DOMRect {
  return {
    x: rect.x,
    y: rect.y,
    top: rect.y,
    left: rect.x,
    right: rect.x + rect.width,
    bottom: rect.y + rect.height,
    width: rect.width,
    height: rect.height,
    toJSON: () => ({}),
  } as DOMRect;
}

/** Register a bounding rect for an element identified by `data-testid`. */
export function setTestRect(testId: string, rect: Rect) {
  testIdRects.set(testId, rect);
}

/** Register a bounding rect for a specific DOM element. */
export function setElementRect(el: Element, rect: Rect) {
  elementRects.set(el, rect);
}

/**
 * Register the DragOverlay's untranslated rect. dnd-kit measures the overlay
 * node once at mount (it matches the dragged card's geometry) and derives the
 * collision rect by adding the live translate, so the overlay rect must equal
 * the source card's rect.
 */
export function setOverlayRect(rect: Rect) {
  overlayRect = rect;
}

export function clearRects() {
  testIdRects.clear();
  elementRects.clear();
  overlayRect = null;
}

/**
 * Mock `getBoundingClientRect` so dnd-kit's collision detection sees real
 * geometry. Rects registered via setTestRect/setElementRect are returned;
 * anything else falls back to jsdom's all-zero default.
 */
export function installRectMock() {
  restoreRectMock();
  const original = Element.prototype.getBoundingClientRect;
  rectSpy = vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
    this: Element,
  ) {
    const byElement = elementRects.get(this);
    if (byElement) return toDomRect(byElement);
    const testId = this.getAttribute("data-testid");
    const byTestId = testId ? testIdRects.get(testId) : undefined;
    if (byTestId) return toDomRect(byTestId);
    // dnd-kit measures the DragOverlay's inner node once at mount (it matches
    // the dragged card's geometry) and derives the collision rect by adding the
    // live translate. The overlay wrapper is position:fixed; its measurable node
    // is that wrapper or its single child. Return the registered overlay rect.
    if (overlayRect && this instanceof HTMLElement) {
      const parentFixed = this.parentElement?.style?.position === "fixed";
      if (this.style?.position === "fixed" || parentFixed) {
        return toDomRect(overlayRect);
      }
    }
    return original.call(this);
  });
  return rectSpy;
}

export function restoreRectMock() {
  rectSpy?.mockRestore();
  rectSpy = null;
  clearRects();
}

function makePointer(type: string, init: PointerEventInit): PointerEvent {
  const evt = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    ...init,
  });
  Object.defineProperty(evt, "isPrimary", { value: true });
  return evt;
}

/**
 * Simulate a dnd-kit PointerSensor drag: press on the source, move beyond the
 * activation distance, then move to the target and release. Each step is
 * dispatched through RTL's fireEvent so React state updates are flushed in
 * act(). The final drop is resolved against the registered rects.
 */
export async function dragPointer(
  source: HTMLElement,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  const pointerId = 1;
  fireEvent(source, makePointer("pointerdown", { pointerId, clientX: from.x, clientY: from.y }));
  // First move past the activation constraint to start the drag.
  fireEvent(
    document,
    makePointer("pointermove", {
      pointerId,
      clientX: from.x + 15,
      clientY: from.y,
    }),
  );
  // Droppable rects are measured on the next rAF tick (Optimized frequency);
  // wait for that measurement before moving to the target so collisions resolve.
  await new Promise((r) => setTimeout(r, 30));
  // Move to the drop target.
  fireEvent(document, makePointer("pointermove", { pointerId, clientX: to.x, clientY: to.y }));
  fireEvent(document, makePointer("pointerup", { pointerId, clientX: to.x, clientY: to.y }));
  await new Promise((r) => setTimeout(r, 0));
}
