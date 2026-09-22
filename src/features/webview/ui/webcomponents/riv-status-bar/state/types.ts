import type { ImageItem } from '@features/webview/store/slice/ImagesSlice';
import type { FormatRegistry } from '@features/image/format/FormatRegistry';
import type { AppStoreState } from '@features/webview/store/types';

export type DisplayedItem =
  | { readonly kind: 'none' }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'loading'; readonly item: ImageItem }
  | { readonly kind: 'resolved'; readonly item: ImageItem; };

export type StatusBarStateContext = {
  readonly appState: AppStoreState;
  readonly displayedItem: DisplayedItem;
  readonly formatRegistry: FormatRegistry;
};
