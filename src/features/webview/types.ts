import * as vscode from 'vscode';
import type { BufferItem } from './buffer';

export type FileSource = {
  id: string;
  name: string;
  uri: vscode.Uri;

  detail?: string;
};

export type WebviewHostMessage =
  | { type: 'items'; items: BufferItem[]; }
  | { type: 'error'; message: string; };

export type WebviewHostMessageType = WebviewHostMessage['type'];

export type WebviewMessage =
  | { type: 'app:ready' }
  | { type: 'openItem'; id: string }
  | { type: 'png'; name: string; base64: string }
  | { type: 'status'; level: 'info' | 'warn' | 'error'; message: string };

export type WebviewMessageType = WebviewMessage['type'];
