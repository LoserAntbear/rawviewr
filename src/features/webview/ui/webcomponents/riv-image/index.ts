import { WebviewCommandType } from '@features/webview/commands/definitions';

import { RIVHTMLElement } from '../RIVHTMLElement';
import { RIVTags } from '../definitions';
import { WebviewDisposableUtils } from '@features/webview/disposable';
import { WebviewContextProvider } from '@features/webview/webviewContext/WebviewContextProvider';
import template from './index.html';
import type { BufferItemData } from '@features/buffer';

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
    this.listenTo();
  }

  public connectedCallback(): void {
    this.emitCommand({
      type: WebviewCommandType.Connected,
      payload: RIVImage.tagName,
    });
  }

  private listenTo(): void {
    console.log('RIVImage: Setting up listener for items change events from ReactiveStore.', WebviewContextProvider.context.store);
    this.disposableStore.add(
      WebviewDisposableUtils.listenTo(
        WebviewContextProvider.context.store,
        `update::item::${this.itemId}`,
        this.handleItemsChange.bind(this) as any
      )
    );
  }

  private handleItemsChange(event: CustomEvent<BufferItemData[]>): void {
    console.log('RIVImage: Received items change event:', event.detail);
    const items = event.detail;

    if (items.length > 0) {
      const lastItem = items[items.length - 1];
      this.updateImage(lastItem);
    }
  }

  private updateImage(item: BufferItemData): void {
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
