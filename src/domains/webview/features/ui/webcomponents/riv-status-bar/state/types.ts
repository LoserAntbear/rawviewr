import type { FormatRegistry } from '@SHARED/features/image/format/FormatRegistry';
import type { ImageItem } from '@WEBVIEW/features/store/slice/ImagesSlice';
import type { AppStoreState } from '@WEBVIEW/features/store/types';

export type LoadingImageItem = Extract<ImageItem, { kind: 'pending' | 'reading' | 'streaming' }>;
export type DisplayedItem =
  | { readonly kind: 'none' }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'loading'; readonly item: LoadingImageItem }
  | { readonly kind: 'resolved'; readonly item: ImageItem };

export type StatusBarStateContext = {
  readonly appState: AppStoreState;
  readonly displayedItem: DisplayedItem;
  readonly formatRegistry: FormatRegistry;
};
