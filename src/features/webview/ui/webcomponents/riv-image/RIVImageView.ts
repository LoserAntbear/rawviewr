import { RIVView } from '../RIVView';
import type { RIVImageCaption } from './types';

export class RIVImageView extends RIVView {
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
  }

  public handleCanvasVisibility(visible: boolean): void {
    const canvas = this.ref<HTMLCanvasElement>('canvas');

    if (canvas) {
      canvas.hidden = !visible;
    }
  }

  public paint(bitmap: ImageBitmap): void {
    const canvas = this.ref<HTMLCanvasElement>('canvas');
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx) {
      bitmap.close();

      throw new Error('Failed to get canvas or its context');
    }

    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    ctx.drawImage(bitmap, 0, 0);

    // Disposing since canvas now has its own copy of the image data.
    bitmap.close();

    this.clearStatus();
    this.handleCanvasVisibility(true);
  }

  private clearStatus(): void {
    const status = this.ref('status');

    if (status) {
      status.hidden = true;
    }
  }
}
