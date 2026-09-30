/**
 * A typed BusEvent rather than a `CustomEvent`
 *
 * Since CustomEvent is available starting from Node v19
 * in v18 it requires `--experimental-global-customevent`
 *
 * the extension host of VS Code 1.85 runs Node 18.15.
 */
export class BusEvent<T> extends Event {
  constructor(type: string, public readonly detail: T) {
    super(type);
  }
}
