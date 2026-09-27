import type * as vscode from 'vscode';

import type { DecodedFileSource } from '@features/image/imageDecoder/types';
import type { DecodeOptions } from '@features/image/imageDecoder/types';
import type { GalleryViewMode } from '../ui/webcomponents/types';
import type { ExportFormat } from '@definitions/exportFormats';
import { FileSource } from '../types';

export type WebviewHostMessageType = WebviewHostMessage['type'];
export type WebviewHostMessage =
  | { type: 'export'; format: ExportFormat; }
  | { type: 'status:error'; message: string; }
  | { type: 'sources:update'; sources: FileSource[]; }
  | { type: 'source:failed'; id: string; message: string; }
  | { type: 'images:decode:ready'; images: DecodedFileSource[]; }
  | { type: 'session:start'; viewMode: GalleryViewMode; decodeOptions: DecodeOptions; };

export type WebviewMessageType = WebviewMessage['type'];
export type WebviewMessage =
  | { type: 'app:ready' }
  | { type: 'gallery:openItem'; id: string }
  | { type: 'sources:request:decode'; ids: FileSource[] }
  | { type: 'export:png'; name: string; data: ArrayBuffer }
  | { type: 'app:status'; level: 'info' | 'warn' | 'error'; message: string };

export interface ItemOpener {
  openSingle(targets: readonly vscode.Uri[]): Promise<void>;
};
