import { ImageItem, type ReadyImageItem } from '@WEBVIEW/features/store/slice/ImagesSlice';

export function validateImageItem(item?: ImageItem): asserts item is ReadyImageItem {
  if (!ImageItem.isReady(item)) {
    throw new Error('Invalid image item');
  }
}
