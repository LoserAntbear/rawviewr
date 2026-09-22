import { attemptAsync } from '@utils/attempt';
import { ExportError } from './ExportError';
import type { WebviewSessionCommunicationBridge } from '../../session/WebviewSessionCommunicationBridge';
import { StoreSliceId } from '../../store/definitions';
import type { AppStore } from '../../store/types';
import type { WebviewMessage } from '../../webviewHost/types';

import { encodeBitmapToPng } from '../encodePng';
import { ImageItem } from '@features/webview/store/slice/ImagesSlice/types';
import { isReadyImageItem } from '@features/webview/store/slice/ImagesSlice/utils';

function requireSelectedId(store: AppStore): string {
  const id = store.selectors.selectedId();

  if (id === null) {
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
  try {
    if (!isReadyImageItem(item)) {
      throw new ExportError('warn', 'Raw Image Viewer: image is not ready for export.');
    }

    return { type: 'export:png', name: `${item.name}.png`, data: await encodeBitmapToPng(item.bitmap) };
  } finally {
    // The canvas took its own copy; these pixels are off-heap. Closed on failure too.
    if (isReadyImageItem(item)) {
      item.bitmap.close();
    }
  }
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
  bridge: WebviewSessionCommunicationBridge,
): Promise<void> {
  bridge.postToWebviewHost(await attemptAsync(() => resolveExportMessage(store), reportFailure));
}
