import * as vscode from 'vscode';

export type ViewerSource = {
  id: string;
  name: string;
  detail: string;
  uri: vscode.Uri;
};

export type ViewerSettings = {
  tileSize: number;
  background: 'checker' | 'black' | 'white' | 'magenta' | 'editor'; // FIXME: Should this be an enum?
};
