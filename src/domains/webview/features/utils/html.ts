export function isHTMLElement(element: unknown): element is HTMLElement {
  return element instanceof HTMLElement;
}

// Deep does mean deep: it traverses shadow roots to find the actual focused element.
export function getFocusElementDeep(root: Document | ShadowRoot = document): Element | null {
  const active = root.activeElement;

  return active?.shadowRoot ? getFocusElementDeep(active.shadowRoot) : active;
}

export function findShadowHostForElement(element: HTMLElement): HTMLElement {
  let host = element;
  let root = host.getRootNode();

  while (root instanceof ShadowRoot && isHTMLElement(root.host)) {
    host = root.host;
    root = host.getRootNode();
  }

  return host;
}

export function isFormControlElement(element: Element | null): boolean {
  return element instanceof HTMLInputElement
    || element instanceof HTMLSelectElement
    || element instanceof HTMLTextAreaElement;
}
