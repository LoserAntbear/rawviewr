import { probePixel } from '@features/image/pixelProbe/PixelProbe';
import { StoreSliceId } from '@webview/store/definitions';
import type { ProbeSample } from '@webview/store/slice/ProbeSlice';
import type { AppStore } from '@webview/store/types';
import { WebviewContextProvider } from '@webview/webviewContext/WebviewContextProvider';
import { validateCanvas, validatePointerEvent, validateImageItem } from '@webview/guards';
import { withThrottle } from '@utils/throttle';

import { resolveProbePosition } from './utils';

interface ProbeTarget { readonly itemId: string };

// Mimic a typical screen refresh rate of ~60Hz.
const PROBE_INTERVAL_MS = 16 as const;

export class ProbeInputHandler {
  constructor(private readonly target: ProbeTarget) {}

  private get store(): AppStore {
    return WebviewContextProvider.context.store;
  }

  /**
   * Limiting pointer tracking to 60 FPS, to avoid calculation overloads on gallery views
   */
  @withThrottle(PROBE_INTERVAL_MS)
  public handlePointerMove(event: Event): void {
    try {
      const sample = this.resolveSampleFromEvent(event);

      if (sample) {
        this.store.get(StoreSliceId.Probe).setHovered(sample);
      }
    } catch (error) {
      console.error('Failed to handle pointer move event:', error);
    }
  }

  public handlePointerLeave(): void {
    this.store.get(StoreSliceId.Probe).clearHovered();
  }

  // private resolveSampleFromEvent(event: Event): ProbeSample | null {
  private resolveSampleFromEvent(event: Event): ProbeSample {
    const canvas = event.target;
    const item = this.store.get(StoreSliceId.Images).getImage(this.target.itemId);

    validateCanvas(canvas);
    validateImageItem(item);
    validatePointerEvent(event);

    const position = resolveProbePosition(
      event,
      canvas.getBoundingClientRect(),
      // Have to resolve the effective scale of the canvas element like that,
      // since `currentCSSZoom` does not return correct value
      // Seems like due to it being a css var
      Number.parseFloat(canvas.computedStyleMap()?.get('zoom')?.toString() ?? '1'),
    );
    const sample = probePixel(
      item.image,
      item.geometry,
      this.store.get(StoreSliceId.DecodeOptions).options,
      position,
    );

    return { id: this.target.itemId, ...sample };
  }
}
