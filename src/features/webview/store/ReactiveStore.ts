/* eslint-disable @typescript-eslint/no-explicit-any */
import type { BufferItemData, BufferItemRegistry } from '../../buffer';

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
  constructor(
    private readonly bufferItemRegistry: BufferItemRegistry,
  ) {
    super();
  }

  public dispatchEvent(event: ReactiveStoreEvent<Type>): boolean {
    return super.dispatchEvent(event);
  }

  public addItems(items: BufferItemData[]): void {
    this.bufferItemRegistry.upsert(items);

    console.log('ReactiveStore: Added items to registry:', items);

    this.dispatchEvent(new CustomEvent('items', { detail: items }) as any);
  }
}
