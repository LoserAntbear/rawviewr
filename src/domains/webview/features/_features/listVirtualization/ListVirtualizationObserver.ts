import { ReactiveSet, type ReactiveSetListener } from '@extensions/ReactiveSet';
import type { WebviewDisposable } from '@SHARED/features/disposable';
import { withDebounce } from '@utils/methods/debounce';

export const INTERSECTION_OBSERVER_CONFIG = {
  delay: 150,
  threshold: 0,
  rootMargin: '100% 0px',
} as const satisfies Omit<IntersectionObserverInit, 'root'>;

export const CROSSCHECK_DELAY_MS = 80 as const;

export class ListVirtualizationObserver<TElement = string> implements WebviewDisposable {
  public get intersectingIds(): ReadonlySet<TElement> {
    return new Set(this._intersectingElementsIds);
  }

  private readonly viewportObserver: IntersectionObserver;
  private readonly _intersectingElementsIds = new ReactiveSet<TElement>();

  private disposed = false;

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
    this._intersectingElementsIds.subscribe(() => this.handleIntersectionUpdates(listener));
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
    this.disposed = true;
    this.viewportObserver.disconnect();
  }

  /**
   * Have to create a separate handler to properly apply the debounce.
   * Since we don't want the debounce to fire after the observer is disposed.
   */
  @withDebounce(CROSSCHECK_DELAY_MS)
  private handleIntersectionUpdates(listener: ReactiveSetListener<TElement>): void {
    if (!this.disposed) {
      listener(Array.from(this._intersectingElementsIds));
    }
  }

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
