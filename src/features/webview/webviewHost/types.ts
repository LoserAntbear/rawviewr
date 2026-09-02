import type { BufferItemData } from '../../buffer';
import type { GalleryViewMode } from '../ui/webcomponents/types';

export type WebviewHostMessageType = WebviewHostMessage['type'];
export type WebviewHostMessage =
  | { type: 'session'; viewMode: GalleryViewMode; }
  | { type: 'items'; items: BufferItemData[]; }
  | { type: 'error'; message: string; };

export type WebviewMessageType = WebviewMessage['type'];
export type WebviewMessage =
  | { type: 'app:ready' }
  | { type: 'openItem'; id: string }
  | { type: 'png'; name: string; base64: string }
  | { type: 'status'; level: 'info' | 'warn' | 'error'; message: string };
