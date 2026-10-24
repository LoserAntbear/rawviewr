/**
 * The idea is to make it responsible for managing the component's own DOM references
 * and processing them.
 *
 * To avoid dumping DOM handlers all over the component itself.
 */
export class RIVView {
  private readonly refs = new Map<string, HTMLElement>();

  constructor(protected readonly root: ShadowRoot) {}

  public ref<T extends HTMLElement>(id: string): T | null {
    const cached = this.refs.get(id) as T | undefined;

    if (cached) {
      return cached;
    }

    const element = this.root.getElementById(id) as T | null;

    if (element) {
      this.refs.set(id, element);
    }

    return element;
  }
}
