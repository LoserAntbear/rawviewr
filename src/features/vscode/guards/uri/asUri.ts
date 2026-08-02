import * as vscode from 'vscode';
import { UriLike } from '@features/vscode/types';
import { nullishCoalesce } from '@utils/coalesce';

function isUriLike(value: unknown): value is UriLike {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<UriLike>;

  return typeof candidate.scheme === 'string' && typeof candidate.path === 'string';
}

/**
 * Arguments crossing a `command:` link or an extension-host boundary are JSON
 * round-tripped, so a `vscode.Uri` arrives as a plain object and `instanceof`
 * fails. Revive those, and accept strings for callers that pass them raw.
 */
function asUriInstance(value: unknown): vscode.Uri | null {
  return (value instanceof vscode.Uri) ? value : null;
}

function asUriLike(value: unknown): vscode.Uri | null {
  if (isUriLike(value)) {
    try {
      return vscode.Uri.from(value);
    } catch {
      return null;
    }
  }

  return null;
}

function asUriString(value: unknown): vscode.Uri | null {
  if (typeof value === 'string') {
    try {
      return vscode.Uri.parse(value, true);
    } catch {
      return null;
    }
  }

  return null;
}

export function asUri(value: unknown): vscode.Uri | null {
  return nullishCoalesce(
    asUriInstance(value),
    asUriLike(value),
    asUriString(value),
  );
}
