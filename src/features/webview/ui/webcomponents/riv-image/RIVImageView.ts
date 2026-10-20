import type { DecodedImage } from '@features/image/imageDecoder/types';

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

  private paintToken: symbol = Symbol('paint');

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

  public async paint(image: DecodedImage): Promise<void> {
    const ctx = this.canvas?.getContext('2d');

    if (!this.canvas || !ctx) {
      throw new Error('Failed to get canvas or its context');
    }

    const sessionToken = this.startPaintSession();
    const bitmap = await createImageBitmap(new ImageData(image.data, image.width, image.height));

    try {
      // A newer paint started while this one was being made: that one wins.
      if (this.isPaintSession(sessionToken)) {
        this.canvas.width = image.width;
        this.canvas.height = image.height;

        ctx.drawImage(bitmap, 0, 0);

        this.clearStatus();
        this.handleCanvasVisibility(true);
      }
    } finally {
      this.clearPaintSession();
      bitmap.close();
    }
  }

  /**
   * A crutchy workaround to force-offload the paint data by resetting the canvas dimensions.
   * This will effectively clear the canvas content from memory.
   *
   * Since simple "hiding" does not remove the associated bitmap data.
   * So the user ends up not seeing anything, but the memory is still being used by the hidden canvas content.
   */
  private offloadPaint(): void {
    this.canvas.width = 0;
    this.canvas.height = 0;
  }

  private startPaintSession(): symbol {
    const token = Symbol('paint');

    this.paintToken = token;

    return token;
  }

  private isPaintSession(token: symbol): boolean {
    return this.paintToken === token;
  }

  private clearPaintSession(): void {
    this.paintToken = Symbol('paint');
  }

  private clearStatus(): void {
    const status = this.ref('status');

    if (status) {
      status.hidden = true;
    }
  }
}
