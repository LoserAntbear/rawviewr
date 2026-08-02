import * as vscode from 'vscode';

import { asUri } from './asUri';
import { ALLOWED_DOCUMENT_SCHEMES } from '../../../../definitions/vscode';

export function asLocalAllowedUri(value: unknown, allowedSchemes: ReadonlySet<string> = ALLOWED_DOCUMENT_SCHEMES): vscode.Uri | null {
  const uri = asUri(value);

  return uri && allowedSchemes.has(uri.scheme) ? uri : null;
}
