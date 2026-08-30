import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";

/** Column count for product mega menu — 2 cols by default, 3 when catalog is larger. */
export function productMegaMenuColumns(productCount: number): 1 | 2 | 3 {
  if (productCount <= 3) return 1;
  if (productCount <= 8) return 2;
  return 3;
}

export function productMegaMenuWidth(columns: 1 | 2 | 3): string {
  if (columns === 1) return "min(100vw - 2rem, 22rem)";
  if (columns === 2) return "min(100vw - 2rem, 40rem)";
  return "min(100vw - 2rem, 52rem)";
}

export function focusFirstMenuItem(container: HTMLElement | null) {
  container?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
}

export function handleMenuKeyDown(
  event: ReactKeyboardEvent,
  rootRef: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const items = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
  if (items.length === 0) return;

  const index = items.indexOf(document.activeElement as HTMLElement);

  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      items[(index + 1 + items.length) % items.length]?.focus();
      break;
    case "ArrowUp":
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
      break;
    case "Home":
      event.preventDefault();
      items[0]?.focus();
      break;
    case "End":
      event.preventDefault();
      items[items.length - 1]?.focus();
      break;
    case "Tab":
      onClose();
      break;
    default:
      break;
  }
}
