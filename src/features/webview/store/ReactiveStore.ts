export type ReactiveStoreEvent<Type extends string = string> = Event & {
  type: Type;
  target: ReactiveStore;
};

/**
 * Extends `EventTarget` so custom components can subscribe to the store
 * via existing native listeners.
 *
 * General application example:
 * `listenTo(ReactiveStoreInstance, 'example-event', (event) => { ... })`
 */
export class ReactiveStore<Type extends string = string> extends EventTarget {
  public dispatchEvent(event: ReactiveStoreEvent<Type>): boolean {
    return super.dispatchEvent(event);
  }
}
