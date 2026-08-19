import * as vscode from 'vscode';

export type FileSource = {
  id: string;
  name: string;
  uri: vscode.Uri;

  detail?: string;
};

export type HostMessage = {};

export type WebviewMessage =
  | { type: 'app:ready' }
  | { type: 'openItem'; id: string }
  | { type: 'png'; name: string; base64: string }
  | { type: 'status'; level: 'info' | 'warn' | 'error'; message: string };
