import type { BufferItemData } from '../../buffer';
import type { DecodeOptions } from '@features/image/imageDecoder/types';
import type { GalleryViewMode } from '../ui/webcomponents/types';
import type { ExportFormat } from '@definitions/exportFormats';

export type WebviewHostMessageType = WebviewHostMessage['type'];
export type WebviewHostMessage =
  | { type: 'items'; items: BufferItemData[]; }
  | { type: 'export'; format: ExportFormat; }
  | { type: 'status:error'; message: string; }
  | { type: 'session:start'; viewMode: GalleryViewMode; decodeOptions: DecodeOptions; };

export type WebviewMessageType = WebviewMessage['type'];
export type WebviewMessage =
  | { type: 'app:ready' }
  | { type: 'gallery:openItem'; id: string }
  | { type: 'export:png'; name: string; base64: string }
  | { type: 'app:status'; level: 'info' | 'warn' | 'error'; message: string };
