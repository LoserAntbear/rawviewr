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

export * from './asUri';
export * from './dedupeUris';
export * from './asLocalUris';
export * from './asLocalAllowedUri';
