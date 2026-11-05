import type * as vscode from 'vscode';

import { IntentKind } from '@definitions/intent';
import type { IntentParser } from '@EXTENSION/features/intent/types';
import { asLocalAllowedUri, asLocalUris, dedupeUris } from '@EXTENSION/features/vscode/guards/uri';
import { isPlainObject, isValidString } from '@guards/index';
import type { ZoomDirection } from '@SHARED/features/zoom';

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

export const parseResetSettings: IntentParser = () => ({ kind: IntentKind.settingsReset });

// Noop, hence no parser.
export const parseCaptureGpuTrace: IntentParser = () => ({ kind: IntentKind.captureGpuTrace });

export const parseRevealItem: IntentParser = (context) => {
  const itemId = isPlainObject(context) ? context.itemId : undefined;

  return isValidString(itemId)
    ? { kind: IntentKind.viewRevealItem, itemId }
    : null;
};

const parseZoom = (direction: ZoomDirection): IntentParser => () => ({
  direction,
  kind: IntentKind.viewZoom,
});

export const parseZoomIn = parseZoom('in');
export const parseZoomOut = parseZoom('out');
export const parseZoomReset = parseZoom('reset');
