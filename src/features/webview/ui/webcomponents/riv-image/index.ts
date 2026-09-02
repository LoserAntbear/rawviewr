import { WebviewCommandType } from '@features/webview/commands/definitions';
import { WebviewContextProvider } from '@features/webview/webviewContext/WebviewContextProvider';
import { itemEventType } from '@features/webview/store/definitions';
import type { BufferItemData } from '@features/buffer';

import { RIVHTMLElement } from '../RIVHTMLElement';
import { RIVTags } from '../definitions';
import template from './index.html';

export class RIVImage extends RIVHTMLElement {
  public static readonly tagName = RIVTags.Image;
  public static readonly observedAttributes = ['item-id'];

  public get itemId(): string {
    return this.getAttribute('item-id') ?? '';
  }

  public set itemId(value: string) {
    this.setAttribute('item-id', value);
  }

  constructor() {
    super();

    this.mount(template);
  }

  public connectedCallback(): void {
    if (!this.itemId) {
      throw new Error(`${this.localName}: mounted without an itemId`);
    }

    const { store } = WebviewContextProvider.context;

    this.observe(store, itemEventType(this.itemId), this.handleItemUpdate.bind(this));

    this.handleItemUpdate();

    this.emitCommand({
      type: WebviewCommandType.Connected,
      payload: RIVImage.tagName,
    });
  }

  /** Store events are signal-only, so current state is pulled rather than read off a payload. */
  private handleItemUpdate(): void {
    const item = WebviewContextProvider.context.store.getItem(this.itemId);

    if (item) {
      this.paint(item);
    }
  }

  private paint(item: BufferItemData): void {
    if (item.data.byteLength === 0) {
      return;
    }

    const canvas = this.ref<HTMLCanvasElement>('canvas');

    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      return;
    }

    const width = 200;
    const height = Math.floor(item.data.byteLength / 4 / width);

    // Intrinsic size, not CSS — an unsized canvas is 300x150 and clips the blit.
    canvas.width = width;
    canvas.height = height;

    const rgba = new Uint8ClampedArray(width * height * 4);
    rgba.set(new Uint8Array(item.data, 0, rgba.length));

    // Until decode lands, force opacity so zero alpha bytes don't hide the result.
    for (let i = 3; i < rgba.length; i += 4) {
      rgba[i] = 255;
    }

    ctx.putImageData(new ImageData(rgba, width, height), 0, 0);
  }
}
