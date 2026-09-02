
export type EventMap = Record<string, unknown>;
type Listener<T> = (event: CustomEvent<T>) => void;
type UnsubscribeCallback = () => void;

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

  public emit<K extends Key>(type: K, ...args: Map[K] extends void ? [] : [detail: Map[K]]): void {
    const detail = args[0] as Map[K];
    const event = new CustomEvent(type, { detail });

    this.dispatchEvent(event);
  }

}
