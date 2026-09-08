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

    // FIXME: I need a better way to handle this without side-effects
    this.handleCanvasVisibility(false);
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
      throw new Error('Failed to get canvas or its context');
    }

    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    // The canvas keeps its own copy from here; retiring the bitmap is the state's job.
    ctx.drawImage(bitmap, 0, 0);

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
