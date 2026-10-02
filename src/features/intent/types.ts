import type * as vscode from 'vscode';

import type { IntentKind } from '@definitions/intent';
import type { ExportFormat } from '@definitions/exportFormats';
import type { ZoomDirection } from '@features/zoom';

export type IntentResolver<K extends IntentKind = IntentKind> = (
  intent: Extract<Intent, { kind: K }>,
) => Promise<void>;

export type IntentResolverMap = { readonly [K in IntentKind]: IntentResolver<K> };

export type Intent =
  | { readonly kind: IntentKind.settingsReset }
  | { readonly kind: IntentKind.viewZoom; readonly direction: ZoomDirection }
  | { readonly kind: IntentKind.fileExportRequest; readonly format: ExportFormat }
  | { readonly kind: IntentKind.viewerOpenSingle; readonly targets: readonly vscode.Uri[] }
  | { readonly kind: IntentKind.viewerOpenGallery; readonly targets: readonly vscode.Uri[] }
  | { readonly kind: IntentKind.viewerOpenFolderGallery; readonly folder: vscode.Uri | null };

export type IntentParserResult = Intent | null;
/**
 * Parses one VS Code command invocation into an extension Intent.
 *
 * The signature is`unknown[]` as per vscode command API
 */
export type IntentParser = (...args: readonly unknown[]) => IntentParserResult;
