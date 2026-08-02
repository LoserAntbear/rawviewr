import * as vscode from 'vscode';
import { ALLOWED_DOCUMENT_SCHEMES } from '../../../definitions/vscode';
import { UriLike } from '../types';
import { nullishCoalesce } from '../../../utils/coalesce';

/**
 * Guards for command arguments.
 *
 * VS Code hands a command whatever the caller supplied:
 * - the palette sends nothing,
 * - the explorer menu sends `(uri, uris)`,
 * - `keybindings.json`, markdown `command:` links, webviews and other extensions send arbitrary JSON.
 *
 * Declared parameter types are erased at compile time and prove nothing,
 * so every argument is parsed here before it becomes an Intent.
 */

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

export function asLocalAllowedUri(value: unknown, allowedSchemes: ReadonlySet<string> = ALLOWED_DOCUMENT_SCHEMES): vscode.Uri | null {
  const uri = asUri(value);

  return uri && allowedSchemes.has(uri.scheme) ? uri : null;
}

export function asLocalUris(value: unknown): vscode.Uri[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((value) => asLocalAllowedUri(value))
    .filter((uri): uri is vscode.Uri => uri !== null);
}

/** Merge the `(uri, uris)` pair the explorer sends, keeping order, dropping repeats. */
export function dedupeUris(uris: readonly vscode.Uri[]): vscode.Uri[] {
  const seen = new Set<string>();

  return uris.filter((uri) => {
    const key = uri.toString();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}
