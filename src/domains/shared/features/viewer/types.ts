import type * as vscode from 'vscode';

import type { ViewerBackground } from './definitions';

export type ViewerConfiguration = {
  tileSize: number;
  background: ViewerBackground; // FIXME: Should this be an enum?
};
export type ContentViewMode = 'single' | 'gallery';

export type FileSource = {
  id: string;
  name: string;
  uri: vscode.Uri;

  detail?: string;
};

export type UriOpener = {
  openSingle(targets: readonly vscode.Uri[]): Promise<void>;
};

