import type * as vscode from 'vscode';

import { ExportFormat } from '../../../definitions/exportFormats';
import { IntentParser } from '../../intent/types';
import { IntentKind } from '../../../definitions/intent';
import { asLocalAllowedUri, asLocalUris, dedupeUris } from '../../vscode/guards/uri';
import { asEnumMember } from '../../../utils/enum';

function parseTargets(args: readonly unknown[]): readonly vscode.Uri[] {
  const [first, second] = args;
  const single = asLocalAllowedUri(first);

  return dedupeUris([...(single ? [single] : []), ...asLocalUris(second)]);
}

export const parseOpen: IntentParser = (...args) => ({
  kind: IntentKind.viewerOpenSingle,
  targets: parseTargets(args),
});

export const parseOpenGallery: IntentParser = (...args) => ({
  kind: IntentKind.viewerOpenGallery,
  targets: parseTargets(args),
});

export const parseOpenFolderGallery: IntentParser = (...args) => ({
  kind: IntentKind.viewerOpenFolderGallery,
  folder: asLocalAllowedUri(args[0]),
});

export const parseExport: IntentParser = (...args) => {
  const format = asEnumMember(ExportFormat, args[0]) || ExportFormat.Png;

  return { kind: IntentKind.viewerRequestExport, format };
};

export const parseResetSettings: IntentParser = () => ({ kind: IntentKind.settingsReset });
