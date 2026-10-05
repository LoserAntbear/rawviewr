import type * as vscode from 'vscode';

import type { Endian } from '@definitions/bits';
import type { ZoomDirection } from '@features/zoom';
import type { SourceBytesResult, SourceLocation } from '@features/image/sourceReader/types';
import type { DecodedFileSource } from '@features/image/imageDecoder/types';
import type { DecodeOptions } from '@features/image/imageDecoder/types';
import type { GalleryViewMode } from '../ui/webcomponents/types';
import type { ExportFormat } from '@definitions/exportFormats';
import { FileSource } from '../types';

export type WebviewHostMessageType = WebviewHostMessage['type'];
export type WebviewHostMessage =
  | { type: 'export'; format: ExportFormat; }
  | { type: 'status:error'; message: string; }
  | { type: 'view:zoom'; direction: ZoomDirection; }
  | { type: 'sources:update'; sources: FileSource[]; }
  | { type: 'images:decode:ready'; images: DecodedFileSource[]; }
  | { type: 'probe:receive:source-bytes'; id: string; location: SourceLocation; result: SourceBytesResult; }
  | { type: 'session:start'; viewMode: GalleryViewMode; decodeOptions: DecodeOptions; };

export type WebviewMessageType = WebviewMessage['type'];
export type WebviewMessage =
  | { type: 'app:ready' }
  | { type: 'export:request' }
  | { type: 'gallery:openItem'; id: string }
  | { type: 'view:fieldFocus'; focused: boolean }
  | { type: 'view:zoom'; direction: ZoomDirection }
  | { type: 'export:png'; name: string; data: ArrayBuffer }
  | { type: 'app:status'; level: 'info' | 'warn' | 'error'; message: string }
  | { type: 'sources:request:decode'; ids: FileSource[]; options: DecodeOptions }
  | { type: 'probe:request'; id: string; location: SourceLocation; endian: Endian };

export interface ItemOpener {
  openSingle(targets: readonly vscode.Uri[]): Promise<void>;
};
