import type { DecodedImage } from '@features/image/imageDecoder/types';

import { RIVView } from '../RIVView';
import type { RIVImageCaption } from './types';

export class RIVImageView extends RIVView {
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

  public handleCanvasVisibility(visible: boolean): void {
    const canvas = this.ref<HTMLCanvasElement>('canvas');

    if (canvas) {
      canvas.hidden = !visible;
    }
  }

  public async paint(image: DecodedImage): Promise<void> {
    const canvas = this.ref<HTMLCanvasElement>('canvas');
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx) {
      throw new Error('Failed to get canvas or its context');
    }

    const sessionToken = this.startPaintSession();
    const bitmap = await createImageBitmap(new ImageData(image.data, image.width, image.height));

    try {
      // A newer paint started while this one was being made: that one wins.
      if (this.isPaintSession(sessionToken)) {
        canvas.width = image.width;
        canvas.height = image.height;

        ctx.drawImage(bitmap, 0, 0);

        this.clearStatus();
        this.handleCanvasVisibility(true);
      }
    } finally {
      this.clearPaintSession();
      bitmap.close();
    }
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
