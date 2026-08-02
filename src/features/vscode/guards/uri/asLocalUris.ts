import * as vscode from 'vscode';

import { asLocalAllowedUri } from './asLocalAllowedUri';

export function asLocalUris(value: unknown): vscode.Uri[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((value) => asLocalAllowedUri(value))
    .filter((uri): uri is vscode.Uri => uri !== null);
}
