import type { BufferItemData } from '@features/buffer';
import { attemptAsync } from '@utils/attempt';
import type { DecodedExport } from './types';
import { ExportError } from './ExportError';
import type { WebviewSessionCommunicationBridge } from '../../session/WebviewSessionCommunicationBridge';
import { StoreSliceId } from '../../store/definitions';
import type { AppStore } from '../../store/types';
import type { WebviewMessage } from '../../webviewHost/types';

import { encodeBitmapToPng } from '../encodePng';

function requireSelectedId(store: AppStore): string {
  const id = store.selectors.selectedId();

  if (id === null) {
    throw new ExportError('warn', 'unable to detect selected image for export.');
  }

  return id;
}

function requireItem(store: AppStore, id: string): BufferItemData {
  const item = store.get(StoreSliceId.Sources).getSource(id);

  if (!item) {
    throw new ExportError('warn', 'Raw Image Viewer: nothing to export.');
  }

  return item;
}

async function requireBitmap(store: AppStore, item: BufferItemData): Promise<DecodedExport> {
  const bitmap = await store.get(StoreSliceId.Decode).decode(item);

  if (!bitmap) {
    throw new ExportError('error', `Raw Image Viewer: ${item.name} has nothing decodable in it.`);
  }

  return { item, bitmap };
}

async function encodeExport({ item, bitmap }: DecodedExport): Promise<WebviewMessage> {
  try {
    return { type: 'export:png', name: `${item.name}.png`, data: await encodeBitmapToPng(bitmap) };
  } finally {
    // The canvas took its own copy; these pixels are off-heap. Closed on failure too.
    bitmap.close();
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
    .then((item) => requireBitmap(store, item))
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
