import type { ImageItem, ReadyImageItem } from './types';

export function isReadyImageItem(item: ImageItem | undefined): item is ReadyImageItem {
  return item?.kind === 'ready';
}

export function retireImageBitmap(oldItem: ImageItem | undefined, newItem?: ImageItem): void {
  const currentItem = isReadyImageItem(newItem) ? newItem.bitmap : null;

  if (isReadyImageItem(oldItem) && oldItem.bitmap !== currentItem) {
    oldItem.bitmap.close();
  }
}
