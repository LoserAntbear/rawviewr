import type { DecodeOptions } from './decode.js';

export type ViewerMode = 'single' | 'gallery';

export interface BufferItem {
  id: string;
  /** Display name (file basename). */
  name: string;
  /** Human-readable location, shown in tooltips. */
  detail: string;
  byteLength: number;
  /** Base64 payload. Absent until the host streams it in. */
  base64?: string;
  error?: string;
}

export interface ViewerSettings {
  background: 'checker' | 'black' | 'white' | 'magenta' | 'editor';
  tileSize: number; 
}

export type HostMessage =
  | {
      type: 'init';
      mode: ViewerMode;
      title: string;
      options: DecodeOptions;
      settings: ViewerSettings;
      items: BufferItem[];
    }
  | { type: 'item'; item: BufferItem }
  | { type: 'settings'; settings: ViewerSettings }
  | { type: 'options'; options: Partial<DecodeOptions> }
  | { type: 'exportPng' };

export type WebviewMessage =
  | { type: 'ready' }
  | { type: 'optionsChanged'; options: DecodeOptions }
  | { type: 'openItem'; id: string }
  | { type: 'png'; name: string; base64: string }
  | { type: 'status'; level: 'info' | 'warn' | 'error'; message: string };
