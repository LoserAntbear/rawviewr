import type { DecodedFileSource } from '@features/image/imageDecoder/types';

import type { ImageItem, ReadyImageItem } from './types';

export function toImageItem(decoded: DecodedFileSource): ImageItem {
  let imageItem: ImageItem;

  switch (decoded.status) {
    case 'success':
      imageItem = { ...decoded, kind: 'ready' };
      break;
    case 'failure':
      imageItem = { kind: 'failed', id: decoded.id, message: decoded.message };
      break;
    default:
      throw new Error(`Unexpected decoded status`);
  }

  return imageItem;
}

export function isReadyImageItem(item: ImageItem | undefined): item is ReadyImageItem {
  return item?.kind === 'ready';
}

export function retireImageBitmap(oldItem: ImageItem | undefined, newItem?: ImageItem): void {
  const currentItem = isReadyImageItem(newItem) ? newItem.bitmap : null;

  if (isReadyImageItem(oldItem) && oldItem.bitmap !== currentItem) {
    oldItem.bitmap.close();
  }
}
