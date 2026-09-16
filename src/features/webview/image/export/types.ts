import type { WebviewMessage } from '../../webviewHost/types';
import type { BufferItemData } from '@features/buffer';

export type DecodedExport = {
  readonly item: BufferItemData;
  readonly bitmap: ImageBitmap;
};
export type StatusLevel = Extract<WebviewMessage, { type: 'app:status' }>['level'];
