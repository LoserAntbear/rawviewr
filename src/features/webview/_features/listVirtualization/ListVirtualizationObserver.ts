import { ReactiveSet, type ReactiveSetListener } from '@extensions/ReactiveSet';
import type { WebviewDisposable } from '@features/webview/disposable';

export const INTERSECTION_OBSERVER_CONFIG = {
  delay: 150,
  threshold: 0,
  rootMargin: '100% 0px',
} as const satisfies Omit<IntersectionObserverInit, 'root'>;

export class ListVirtualizationObserver<TElement = string> implements WebviewDisposable {
  public get intersectingIds(): ReadonlySet<TElement> {
    return new Set(this._intersectingElementsIds);
  }

  private readonly viewportObserver: IntersectionObserver;
  private readonly _intersectingElementsIds = new ReactiveSet<TElement>();

  // Like in the ideal world we'd definitely prefer to DI the IntersectionObserver
  // But we can't do that since we can't reassign the handler of it or trigger one manually.
  // Thus we instantiate it directly like cavemen.
  // Sometimes we're here just to suffer.
  constructor(
    observerRoot: Element,
    listener: ReactiveSetListener<TElement>,
    config: IntersectionObserverInit = INTERSECTION_OBSERVER_CONFIG,
  ) {
    this.viewportObserver = new IntersectionObserver(
      this.handleIntersection.bind(this),
      { ...config, root: observerRoot },
    );
    this._intersectingElementsIds.subscribe(listener);
  }

  public observe(entries: Element[]): void {
    for (const entry of entries) {
      this.viewportObserver.observe(entry);
    }
  }

  public unobserve(entries: Element[]): void {
    for (const entry of entries) {
      this.viewportObserver.unobserve(entry);
    }
  }

  public dispose(): void {
    this.viewportObserver.disconnect();
  }

  /**
   * TODO: Add a short debounce on entries validation.
   *
   * Why: when the user scrolls fast as hell there will appear delayed calls of intersection handlers
   * And on fast scroll we just can skip them, since they must be far-far gone at the point we want to call them
   *
   * So we kinda take a bit of time to •ensure• that no more delayed intersection calls are coming
   * And then we can safely update the intersecting elements set.
   */
  private handleIntersection(entries: readonly IntersectionObserverEntry[]): void {
    const newValues: TElement[] = [];
    const staleValues: TElement[] = [];

    for (const { target, isIntersecting } of entries) {
      // Definitely calls for more dynamic ways to associate elements with IDs, but for now we rely on the dataset.
      const id = (target as HTMLElement).dataset.itemId as TElement | undefined;

      if (id === undefined) {
        console.warn('IntersectionObserver target element is missing data-item-id attribute. Or `itemId` dataset property.');

        continue;
      }

      (isIntersecting ? newValues : staleValues).push(id);
    }

    this._intersectingElementsIds.refine(newValues, staleValues);
  }
}
