import type { ImageItem, ReadyImageItem } from '@WEBVIEW/features/store/slice/ImagesSlice';
import { isReadyImageItem } from '@WEBVIEW/features/store/slice/ImagesSlice';

export function validateImageItem(item?: ImageItem): asserts item is ReadyImageItem {
  if (!isReadyImageItem(item)) {
    throw new Error('Invalid image item');
  }
}
