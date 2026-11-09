/**
 * Placeholders a configured capture argv may use. These are ours, expanded by the configured
 * tool itself — VS Code expands `${...}` only in `tasks.json` and `launch.json`, so a setting
 * read through the configuration API arrives with the literal text still in it.
 *
 * `${config:some.key}`, which VS Code's own resolver does support, is deliberately **not**
 * offered: it would let any workspace define a window-scoped setting and have it substituted
 * into the argv of a program we run, which is exactly what `scope: "machine"` on these
 * settings exists to prevent.
 *
 * A built-in tool has no placeholders at all. It owns its command line, so there is nothing to
 * substitute into.
 */
export const CAPTURE_CONFIG_PLACEHOLDERS = {
  pid: '${pid}',
  output: '${output}',
  workspaceFolder: '${workspaceFolder}',
} as const;

export const CAPTURE_BUFFER_CONTAINER = '.raw' as const;
export const CAPTURE_STORAGE_FOLDER = 'capture' as const;
export const CAPTURE_SETTINGS_QUERY = 'rawImageViewer.capture' as const;
export const CAPTURE_STATUS_BAR_PRIORITY = 100 as const;
export const CAPTURE_STATUS_BAR_ID = 'rawImageViewer.capture' as const;
