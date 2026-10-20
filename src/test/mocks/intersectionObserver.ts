import { vi } from 'vitest';

/**
 * happy-dom ships `IntersectionObserver` as a stub: `observe()` is a `// TODO: Implement` and
 * the callback is never invoked. Anything that reacts to intersection therefore needs the
 * passes driven by hand, which is what this does.
 *
 * It mimics the two rules the real one is relied on for: `observe` on a target already being
 * watched is a no-op, and the first pass reports every target whether it intersects or not.
 */
export type FakeIntersectionObserver = {
  readonly root: unknown;
  readonly options: IntersectionObserverInit;
  readonly targets: readonly Element[];
  readonly disconnected: boolean;

  /** Reports the named targets, leaving every other watched target unmentioned. */
  report(entries: readonly [Element, boolean][]): void;
  /** The first pass: every watched target, with the intersecting ones named. */
  reportFirstPass(intersecting: readonly Element[]): void;
};

export function installFakeIntersectionObserver(): { readonly instances: FakeIntersectionObserver[] } {
  const instances: FakeIntersectionObserver[] = [];

  vi.stubGlobal('IntersectionObserver', class {
    private readonly watched: Element[] = [];
    private gone = false;

    constructor(
      private readonly callback: IntersectionObserverCallback,
      private readonly init: IntersectionObserverInit = {},
    ) {
      instances.push(this as unknown as FakeIntersectionObserver);
    }

    public get root(): unknown {
      return this.init.root;
    }

    public get options(): IntersectionObserverInit {
      return this.init;
    }

    public get targets(): readonly Element[] {
      return this.watched;
    }

    public get disconnected(): boolean {
      return this.gone;
    }

    public observe(target: Element): void {
      // Per spec: a target already in the observation set is not added again.
      if (!this.watched.includes(target)) {
        this.watched.push(target);
      }
    }

    public unobserve(target: Element): void {
      const at = this.watched.indexOf(target);

      if (at !== -1) {
        this.watched.splice(at, 1);
      }
    }

    public disconnect(): void {
      this.gone = true;
      this.watched.length = 0;
    }

    public takeRecords(): IntersectionObserverEntry[] {
      return [];
    }

    public report(entries: readonly [Element, boolean][]): void {
      this.callback(
        entries.map(([target, isIntersecting]) => ({ target, isIntersecting } as IntersectionObserverEntry)),
        this as unknown as IntersectionObserver,
      );
    }

    public reportFirstPass(intersecting: readonly Element[]): void {
      this.report(this.watched.map((target) => [target, intersecting.includes(target)]));
    }
  });

  return { instances };
}
