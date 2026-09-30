import { BusEvent } from '@features/webview/messaging/BusEvent';

export type EventMap<K extends string = string> = Record<K, unknown>;
type UnsubscribeCallback = () => void;

type Listener<T> = (event: BusEvent<T>) => void;

export class TypedEventTarget<
  Map extends EventMap,
  Key extends keyof Map & string = keyof Map & string,
> extends EventTarget {
  public on<K extends Key>(
    type: K,
    listener: Listener<Map[K]>,
    options?: AddEventListenerOptions | boolean,
  ): UnsubscribeCallback {
    this.addEventListener(type, listener as EventListener, options);

    return this.off.bind(this, type, listener as EventListener, options);
  }

  public off<K extends Key>(
    type: K,
    listener: Listener<Map[K]>,
    options?: EventListenerOptions | boolean,
  ): void {
    this.removeEventListener(type, listener as EventListener, options);
  }

  public emit<K extends Key>(type: K, detail: Map[K]): void {
    this.dispatchEvent(new BusEvent(type, detail));
  }
}
