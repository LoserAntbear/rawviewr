import type * as vscode from 'vscode';

import type { IntentKind } from '../../definitions/intent';
import type { ExportFormat } from '../../definitions/exportFormats';

export type IntentResolver<K extends IntentKind = IntentKind> = (
  intent: Extract<Intent, { kind: K }>,
) => Promise<void>;

export type IntentResolverMap = { readonly [K in IntentKind]: IntentResolver<K> };

/**
 * Deliberately a discriminated union rather than a class hierarchy,
 * so that the compiler can exhaustively check intent handling and so that the intent vocabulary is fully visible in one place.
 */
export type Intent =
  | { readonly kind: IntentKind.viewerOpenSingle; readonly targets: readonly vscode.Uri[] }
  | { readonly kind: IntentKind.viewerOpenGallery; readonly targets: readonly vscode.Uri[] }
  | { readonly kind: IntentKind.viewerOpenFolderGallery; readonly folder: vscode.Uri | null }
  | { readonly kind: IntentKind.viewerRequestExport; readonly format: ExportFormat }
  | { readonly kind: IntentKind.settingsReset };

export type IntentParserResult = Intent | null;
/**
 * Parses one VS Code command invocation into an extension Intent.
 *
 * The signature is`unknown[]` as per vscode command API
 */
export type IntentParser = (...args: readonly unknown[]) => IntentParserResult;
