import * as vscode from 'vscode';
import type { ViewerBackground } from './definitions';

export type ViewerSource = {
  id: string;
  name: string;
  detail: string;
  uri: vscode.Uri;
};

export type ViewerConfiguration = {
  tileSize: number;
  background: ViewerBackground; // FIXME: Should this be an enum?
};

export type ViewerMode = 'single' | 'gallery';
