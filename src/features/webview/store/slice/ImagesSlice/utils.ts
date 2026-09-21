import type { ImageItem } from './types';

export function isReadyImageItem(item: ImageItem | undefined): item is { readonly kind: 'ready'; readonly bitmap: ImageBitmap } {
  return item?.kind === 'ready';
}

export function retireImageBitmap(oldItem: ImageItem | undefined, newItem?: ImageItem): void {
  const currentItem = isReadyImageItem(newItem) ? newItem.bitmap : null;

  if (isReadyImageItem(oldItem) && oldItem.bitmap !== currentItem) {
    oldItem.bitmap.close();
  }
}
