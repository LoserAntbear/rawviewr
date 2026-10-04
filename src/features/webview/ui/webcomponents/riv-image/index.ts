import { attemptDetached } from '@utils/attempt';

import { WebviewContextProvider } from '@features/webview/webviewContext/WebviewContextProvider';
import { StoreSliceId } from '@features/webview/store/definitions';

import { RIVHTMLElement } from '../RIVHTMLElement';
import { RIVTags } from '../definitions';
import { RIVImageStateKind } from './definitions';
import { RIVImageView } from './RIVImageView';
import { resolveImageState } from './RivImageState';
import type { RIVImageRenderer, RIVImageRendererMap, RIVImageState } from './types';
import template from './index.html';
import styles from './index.css';
import { ImagesState } from '@features/webview/store/slice/ImagesSlice';
import type { BusEvent } from '@features/webview/messaging';
import { ProbeInputHandler } from '@webview/_features/input/pointerInput/ProbeInputHandler';

export class RIVImage extends RIVHTMLElement {
  public static readonly tagName = RIVTags.Image;
  public static readonly observedAttributes = ['item-id'];

  public get itemId(): string {
    return this.getAttribute('item-id') ?? '';
  }

  public set itemId(value: string) {
    this.setAttribute('item-id', value);
  }

  protected readonly view = new RIVImageView(this.mount(template, styles));

  private readonly probeInputHandler = new ProbeInputHandler(this);
  private readonly renderers: RIVImageRendererMap = {
    [RIVImageStateKind.Paint]: ({ image }) => this.view.paint(image),
    [RIVImageStateKind.Loading]: () => this.view.showStatus('loading…'),
    [RIVImageStateKind.Empty]: () => this.view.showStatus('nothing to decode'),
    [RIVImageStateKind.Error]: ({ message }) => this.view.showStatus(message, 'error'),
  };

  public connectedCallback(): void {
    if (!this.itemId) {
      throw new Error(`${this.localName}: mounted without an itemId`);
    }

    const { store } = WebviewContextProvider.context;

    this.observe(store.bus, "images:change", this.handleItemsChange.bind(this));
    this.observe(store.bus, "decodeOptions:change", this.render.bind(this));

    this.observeProbeInput();
    this.render();
  }

  private observeProbeInput(): void {
    const canvas = this.ref<HTMLCanvasElement>('canvas');

    if (!canvas) {
      throw new Error(`${this.localName}: template is missing #canvas`);
    }

    this.observe(canvas, 'pointermove', this.probeInputHandler.handlePointerMove.bind(this.probeInputHandler));
    this.observe(canvas, 'pointerleave', this.probeInputHandler.handlePointerLeave.bind(this.probeInputHandler));
  }

  // Currently I have to traverse the entire items state to determine if this particular image needs to re-render.
  // FIXME: Optimize this by having the store emit more granular events or by indexing items by ID.
  private handleItemsChange(event: Event): void {
    const { prev, next } = (event as BusEvent<{ prev: ImagesState; next: ImagesState }>).detail;

    if (prev.byId.get(this.itemId) !== next.byId.get(this.itemId)) {
      this.render();
    }
  }

  private render(): void {
    const { store } = WebviewContextProvider.context;

    this.renderState(resolveImageState(
      store.get(StoreSliceId.Images).getImage(this.itemId),
    ));
  }

  private renderState(state: RIVImageState): void {
    this.view.renderCaption(state.caption);

    const renderer = this.renderers[state.kind] as RIVImageRenderer;

    // Painting is async, and a render is a sync edge: the boundary ends here.
    attemptDetached(
      () => renderer(state),
      (error) => console.error(`${this.localName}: painting "${this.itemId}" failed`, error),
    );
  }
}
