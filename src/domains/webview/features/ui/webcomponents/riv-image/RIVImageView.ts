import type { DecodedSegment, SegmentedImage } from '@SHARED/features/image/imageDecoder';
import type { Dimension } from '@SHARED/features/image/imageDecoder/imagePreparation/types';

import { RIVView } from '../RIVView';

import type { RIVImageCaption } from './types';

export class RIVImageView extends RIVView {
  private get canvas(): HTMLCanvasElement {
    try {
      const canvas = this.ref<HTMLCanvasElement>('canvas')

      if (!canvas) {
        throw new Error('Canvas element not found');
      }

      return canvas;
    } catch (error) {
      throw new Error(`Failed to get canvas element: ${error}`  );
    }
  }

  private paintedRunId: string | null = null;
  private paintedSegments = 0;

  public renderCaption(caption: RIVImageCaption): void {
    const name = this.ref('name');
    const meta = this.ref('meta');

    if (name) {
      name.textContent = caption.name;
      name.title = caption.title;
    }

    if (meta) {
      meta.textContent = caption.meta;
    }
  }

  public showStatus(message: string, level: 'info' | 'error' = 'info'): void {
    const status = this.ref('status');

    if (status) {
      status.textContent = message;
      status.hidden = false;
      status.dataset.level = level;
    }

    // FIXME: I need a better way to handle this without side-effects
    this.handleCanvasVisibility(false);
  }

  public handleCanvasVisibility(isVisible: boolean): void {
    this.canvas.hidden = !isVisible;

    if (!isVisible) {
      this.offloadPaint();
    }
  }

  public paint(image: SegmentedImage, runId: string): void {
    const ctx = this.canvas?.getContext('2d');

    if (!this.canvas || !ctx) {
      throw new Error('Failed to get canvas or its context');
    }

    if (this.paintedRunId !== runId) {
      this.openRun(image, runId);
    }

    for (const segment of image.segments.slice(this.paintedSegments)) {
      this.drawSegment(ctx, image.width, segment);
    }

    this.paintedSegments = image.segments.length;
  }

  /**
   * A crutchy workaround to force-offload the paint data by resetting the canvas dimensions.
   * This will effectively clear the canvas content from memory.
   *
   * Since simple "hiding" does not remove the associated bitmap data.
   * So the user ends up not seeing anything, but the memory is still being used by the hidden canvas content.
   */
  private offloadPaint(): void {
    this.prepareRun();
  }

  private openRun(image: SegmentedImage, runId: string): void {
    this.prepareRun(image, runId);

    this.canvas.hidden = false;
  }

  private prepareRun(
    canvasDimension: Dimension = { width: 0, height: 0 },
    runId: string | null = null,
  ): void {
    this.canvas.width = canvasDimension.width;
    this.canvas.height = canvasDimension.height;

    this.paintedRunId = runId;
    this.paintedSegments = 0;

    this.clearStatus();
  }

  private drawSegment(
    ctx: CanvasRenderingContext2D,
    width: number,
    { row, totalRows, data }: DecodedSegment,
  ): void {
    ctx.putImageData(new ImageData(data, width, totalRows), 0, row);
  }

  private clearStatus(): void {
    const status = this.ref('status');

    if (status) {
      status.hidden = true;
    }
  }
}
