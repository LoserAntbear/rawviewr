import type * as vscode from 'vscode';

import type { Endian } from '@definitions/bits';
import type { ExportFormat } from '@definitions/exportFormats';

import type { DecodedFileSource, DecodeOptions } from '@features/image/imageDecoder/types';
import type { SourceBytesResult, SourceLocation } from '@features/image/sourceReader/types';
import type { ToolbarOptionsSnapshot } from '@features/settings/snapshot';
import type { ViewerConfiguration } from '@features/settings/VSCodeWorkspaceConfig/types';
import type { ViewerBackground } from '@features/viewer/definitions';
import type { ZoomDirection } from '@features/zoom';

import type { FileSource } from '../types';
import type { GalleryViewMode } from '../ui/webcomponents/types';

export type WebviewHostMessageType = WebviewHostMessage['type'];
export type WebviewHostMessage =
  | { type: 'export'; format: ExportFormat; }
  | { type: 'status:error'; message: string; }
  | { type: 'view:zoom'; direction: ZoomDirection; }
  | { type: 'sources:update'; sources: FileSource[]; }
  | { type: 'view:config:update'; config: ViewerConfiguration; }
  | { type: 'images:decode:ready'; images: DecodedFileSource[]; }
  | { type: 'decode:options:preserved'; snapshot: ToolbarOptionsSnapshot; }
  | { type: 'probe:receive:source-bytes'; id: string; location: SourceLocation; result: SourceBytesResult; }
  | { type: 'session:start'; viewMode: GalleryViewMode; decodeOptions: DecodeOptions; background: ViewerBackground; };

export type WebviewMessageType = WebviewMessage['type'];
export type WebviewMessage =
  | { type: 'app:ready' }
  | { type: 'export:request' }
  | { type: 'gallery:openItem'; id: string }
  | { type: 'view:fieldFocus'; focused: boolean }
  | { type: 'view:zoom'; direction: ZoomDirection }
  | { type: 'export:png'; name: string; data: ArrayBuffer }
  | { type: 'decode:options:preserve'; preserved: boolean }
  | { type: 'view:background:update'; background: ViewerBackground }
  | { type: 'decode:options:update'; options: Partial<DecodeOptions> }
  | { type: 'decode:options:snapshot'; snapshot: ToolbarOptionsSnapshot }
  | { type: 'app:status'; level: 'info' | 'warn' | 'error'; message: string }
  | { type: 'sources:request:decode'; ids: FileSource[]; options: DecodeOptions }
  | { type: 'probe:request'; id: string; location: SourceLocation; endian: Endian };

export type ItemOpener = {
  openSingle(targets: readonly vscode.Uri[]): Promise<void>;
};
