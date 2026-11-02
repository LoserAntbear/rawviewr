import { attemptDetached } from '@utils/attempt';
import { ProbeInputHandler } from '@WEBVIEW/features/_features/input/pointerInput/ProbeInputHandler';
import { StoreSliceId } from '@WEBVIEW/features/store/definitions';
import { WebviewContextProvider } from '@WEBVIEW/features/webviewContext/WebviewContextProvider';

import { RIVTags } from '../definitions';
import { RIVHTMLElement } from '../RIVHTMLElement';

import { RIVImageStateKind } from './definitions';
import styles from './index.css';
import template from './index.html';
import { resolveImageState } from './RivImageState';
import { RIVImageView } from './RIVImageView';
import type { RIVImageRenderer, RIVImageRendererMap, RIVImageState } from './types';

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
    [RIVImageStateKind.Empty]: () => this.view.showStatus('nothing to decode'),
    [RIVImageStateKind.Loading]: ({ message }) => this.view.showStatus(message),
    [RIVImageStateKind.Paint]: ({ image, runId }) => this.view.paint(image, runId),
    [RIVImageStateKind.Error]: ({ message }) => this.view.showStatus(message, 'error'),
  };

  public connectedCallback(): void {
    if (!this.itemId) {
      throw new Error(`${this.localName}: mounted without an itemId`);
    }

    const { store } = WebviewContextProvider.context;

    this.observeProbeInput();

    this.disposableStore.add(store.subscribe(
      (state) => state[StoreSliceId.Images].byId.get(this.itemId),
      (item) => this.renderState(resolveImageState(item)),
    ));
  }

  private observeProbeInput(): void {
    const canvas = this.ref<HTMLCanvasElement>('canvas');

    if (!canvas) {
      throw new Error(`${this.localName}: template is missing #canvas`);
    }

    this.observe(canvas, 'pointermove', this.probeInputHandler.handlePointerMove.bind(this.probeInputHandler));
    this.observe(canvas, 'pointerleave', this.probeInputHandler.handlePointerLeave.bind(this.probeInputHandler));
    this.observe(canvas, 'click', this.probeInputHandler.handlePointerClick.bind(this.probeInputHandler));
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
