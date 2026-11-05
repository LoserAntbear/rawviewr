/**
 * Placeholders the capture argv may use. These are ours, expanded here — VS Code expands
 * `${...}` only in `tasks.json` and `launch.json`, so a setting read through the configuration
 * API arrives with the literal text in it.
 *
 * `${config:some.key}`, which VS Code's own resolver does support, is deliberately **not**
 * offered: it would let any workspace define a window-scoped setting and have it substituted
 * into the argv of a program we run, which is exactly what `scope: "machine"` on these
 * settings exists to prevent.
 */
export const CAPTURE_CONFIG_PLACEHOLDERS = {
  pid: '${pid}',
  output: '${output}',
  workspaceFolder: '${workspaceFolder}',
} as const;

export const GPU_CAPTURE_TOOLS = {
  darwin: 'mtlcapture',
  linux: 'TBD', // TODO: Update with the correct Linux GPU capture tool
  win32: 'TBD.exe', // TODO: Update with the correct Windows GPU capture tool
} as const;

export type GPUTraceTool = typeof GPU_CAPTURE_TOOLS[keyof typeof GPU_CAPTURE_TOOLS];

export const GPU_TRACE_EXTENSION_BY_TOOL: Record<GPUTraceTool, string> = {
  mtlcapture: 'gputrace',
  TBD: 'tbd.ext', // TODO: Update with the correct Linux GPU capture tool
  'TBD.exe': 'tbd.exe.ext', // TODO: Update with the correct Windows GPU capture tool
};
export const CAPTURE_STORAGE_FOLDER = 'capture' as const;
export const CAPTURE_OUTPUT_CHANNEL = 'Raw Image Viewer' as const;

export const CAPTURE_STATUS_BAR_PRIORITY = 100 as const;
export const CAPTURE_STATUS_BAR_ID = 'rawImageViewer.capture' as const;
