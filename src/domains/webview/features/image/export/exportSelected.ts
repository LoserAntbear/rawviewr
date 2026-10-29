import type { MessagePoster } from '@SHARED/features/messaging';
import type { WebviewMessage } from '@SHARED/features/messaging/protocol';
import { attemptAsync } from '@utils/attempt';
import { ImageItem } from '@WEBVIEW/features/store/slice/ImagesSlice';

import { StoreSliceId } from '../../store/definitions';
import type { AppStore } from '../../store/types';
import { encodeImageToPng } from '../encodePng';

import { ExportError } from './ExportError';

function requireSelectedId(store: AppStore): string {
  // `??` is lazy: what is on screen is only consulted when nothing was picked.
  const id = store.selectors.selectedId() ?? store.selectors.visibleIds()[0];

  if (id === undefined) {
    throw new ExportError('warn', 'unable to detect selected image for export.');
  }

  return id;
}

function requireItem(store: AppStore, id: string): ImageItem {
  const item = store.get(StoreSliceId.Images).getImage(id);

  if (!item) {
    throw new ExportError('warn', 'Raw Image Viewer: nothing to export.');
  }

  return item;
}

async function encodeExport(item: ImageItem): Promise<WebviewMessage> {
  if (!ImageItem.isReady(item)) {
    throw new ExportError('warn', 'Raw Image Viewer: image is not ready for export.');
  }

  return {
    type: 'export:png',
    id: item.id,
    name: `${item.name}.png`,
    data: await encodeImageToPng(item.image),
  };
}

function resolveExportError(error: unknown): WebviewMessage {
  if (error instanceof ExportError) {
    return error.message;
  }

  throw error;
}

export function resolveExportMessage(store: AppStore): Promise<WebviewMessage> {
  return Promise.resolve(store)
    .then(requireSelectedId)
    .then((id) => requireItem(store, id))
    .then(encodeExport)
    .catch(resolveExportError);
}

function reportFailure(error: unknown): WebviewMessage {
  console.error('Raw Image Viewer: export failed', error);

  return {
    type: 'app:status',
    level: 'error',
    message: `Raw Image Viewer: export failed — ${error instanceof Error ? error.message : String(error)}`,
  };
}

export async function exportSelected(
  store: AppStore,
  bridge: MessagePoster<WebviewMessage>,
): Promise<void> {
  return bridge.post(await attemptAsync(() => resolveExportMessage(store), reportFailure));
}
