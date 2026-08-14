import * as vscode from 'vscode';

export type FileSource = {
  id: string;
  name: string;
  uri: vscode.Uri;

  detail?: string;
};

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

export type HostMessage = {};

export type WebviewMessage =
  | { type: 'app:ready' }
  | { type: 'openItem'; id: string }
  | { type: 'png'; name: string; base64: string }
  | { type: 'status'; level: 'info' | 'warn' | 'error'; message: string };
