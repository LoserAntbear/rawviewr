import type { ImageItem, ReadyImageItem } from '@webview/store/slice/ImagesSlice';
import { isReadyImageItem } from '@webview/store/slice/ImagesSlice';

export function validateImageItem(item?: ImageItem): asserts item is ReadyImageItem {
  if (!isReadyImageItem(item)) {
    throw new Error('Invalid image item');
  }
}
