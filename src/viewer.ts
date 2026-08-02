import * as vscode from 'vscode';
import { DEFAULT_OPTIONS, type DecodeOptions } from './common/decode.js';
import { ExportFormat } from './definitions/exportFormats.js';
import { FORMATS, formatsByGroup } from './common/formats.js';
import type {
  BufferItem,
  HostMessage,
  ViewerMode,
  ViewerSettings,
  WebviewMessage,
} from './common/protocol.js';

export interface ViewerSource {
  id: string;
  name: string;
  detail: string;
  uri: vscode.Uri;
}

export const OPTIONS_MEMENTO_PREFIX = 'rawImageViewer.options:';

/** Exhaustive by construction: a new ExportFormat member breaks the build here. */
const EXPORT_MESSAGES: Record<ExportFormat, HostMessage> = {
  [ExportFormat.Png]: { type: 'exportPng' },
};

export function readSettings(): ViewerSettings {
  const config = vscode.workspace.getConfiguration('rawImageViewer');
  return {
    background: config.get<ViewerSettings['background']>('background', 'checker'),
    tileSize: config.get<number>('tileSize', 160),
  };
}

export function defaultOptions(): DecodeOptions {
  const config = vscode.workspace.getConfiguration('rawImageViewer');
  const format = config.get<string>('defaultFormat', DEFAULT_OPTIONS.format);
  return {
    ...DEFAULT_OPTIONS,
    format: FORMATS.has(format) ? format : DEFAULT_OPTIONS.format,
    width: Math.max(0, config.get<number>('defaultWidth', 0)),
    height: Math.max(0, config.get<number>('defaultHeight', 0)),
    offset: Math.max(0, config.get<number>('defaultOffset', 0)),
    littleEndian: config.get<boolean>('defaultLittleEndian', true),
    alphaMode: config.get<DecodeOptions['alphaMode']>('defaultAlphaMode', 'use'),
  };
}

function maxFileSizeBytes(): number {
  return Math.max(1, vscode.workspace.getConfiguration('rawImageViewer').get<number>('maxFileSizeMB', 64)) * 1024 * 1024;
}

/**
 * Drives one webview: streams buffers in, keeps decode options in sync and
 * remembers them per buffer so reopening a file lands on the same view.
 */
export class Viewer {
  private readonly disposables: vscode.Disposable[] = [];
  private options: DecodeOptions;
  private ready = false;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly webview: vscode.Webview,
    private readonly mode: ViewerMode,
    private readonly title: string,
    private readonly sources: ViewerSource[],
    private readonly onOpenItem?: (uri: vscode.Uri) => void,
  ) {
    this.options = { ...defaultOptions(), ...this.loadOptions() };

    this.webview.options = { enableScripts: true, localResourceRoots: [context.extensionUri] };
    this.webview.html = renderHtml(this.webview, context.extensionUri);

    this.disposables.push(
      this.webview.onDidReceiveMessage((message: WebviewMessage) => this.handle(message)),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('rawImageViewer')) {
          this.post({ type: 'settings', settings: readSettings() });
        }
      }),
    );
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables.length = 0;
  }

  /** Called by the host when the user picks a new format from the palette. */
  applyOptions(patch: Partial<DecodeOptions>): void {
    this.options = { ...this.options, ...patch };
    this.saveOptions();
    this.post({ type: 'options', options: patch });
  }

  requestExport(format: ExportFormat): void {
    this.post(EXPORT_MESSAGES[format]);
  }

  private get mementoKey(): string {
    const key = this.mode === 'gallery' ? this.title : this.sources[0]?.uri.toString() ?? this.title;
    return `${OPTIONS_MEMENTO_PREFIX}${key}`;
  }

  private loadOptions(): Partial<DecodeOptions> {
    return this.context.workspaceState.get<Partial<DecodeOptions>>(this.mementoKey) ?? {};
  }

  private saveOptions(): void {
    void this.context.workspaceState.update(this.mementoKey, this.options);
  }

  private post(message: HostMessage): void {
    void this.webview.postMessage(message);
  }

  private async handle(message: WebviewMessage): Promise<void> {
    switch (message.type) {
      case 'ready':
        if (!this.ready) {
          this.ready = true;
          await this.sendInitial();
        }
        break;
      case 'optionsChanged':
        this.options = message.options;
        this.saveOptions();
        break;
      case 'openItem': {
        const source = this.sources.find((s) => s.id === message.id);
        if (source) {
          this.onOpenItem?.(source.uri);
        }
        break;
      }
      case 'png':
        await this.savePng(message.name, message.base64);
        break;
      case 'status':
        if (message.level === 'error') {
          void vscode.window.showErrorMessage(message.message);
        } else {
          void vscode.window.showInformationMessage(message.message);
        }
        break;
    }
  }

  private async sendInitial(): Promise<void> {
    // Send the shell straight away so the toolbar is usable, then stream the
    // buffers in — a folder of dumps can be a lot of bytes.
    const stubs: BufferItem[] = this.sources.map((source) => ({
      id: source.id,
      name: source.name,
      detail: source.detail,
      byteLength: 0,
    }));

    this.post({
      type: 'init',
      mode: this.mode,
      title: this.title,
      options: this.options,
      settings: readSettings(),
      items: stubs,
    });

    const limit = maxFileSizeBytes();
    for (const source of this.sources) {
      try {
        const bytes = await vscode.workspace.fs.readFile(source.uri);
        if (bytes.byteLength > limit) {
          this.post({
            type: 'item',
            item: {
              id: source.id,
              name: source.name,
              detail: source.detail,
              byteLength: bytes.byteLength,
              error: `too large (${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB > rawImageViewer.maxFileSizeMB)`,
            },
          });
          continue;
        }
        this.post({
          type: 'item',
          item: {
            id: source.id,
            name: source.name,
            detail: source.detail,
            byteLength: bytes.byteLength,
            base64: Buffer.from(bytes).toString('base64'),
          },
        });
      } catch (error) {
        this.post({
          type: 'item',
          item: {
            id: source.id,
            name: source.name,
            detail: source.detail,
            byteLength: 0,
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }
  }

  private async savePng(name: string, base64: string): Promise<void> {
    const anchor = this.sources[0]?.uri;
    const defaultUri = anchor ? vscode.Uri.joinPath(anchor, '..', name) : undefined;
    const target = await vscode.window.showSaveDialog({
      defaultUri,
      filters: { 'PNG image': ['png'] },
      title: 'Export decoded image',
    });
    if (!target) {
      return;
    }
    await vscode.workspace.fs.writeFile(target, Buffer.from(base64, 'base64'));
    const open = await vscode.window.showInformationMessage(
      `Saved ${vscode.workspace.asRelativePath(target)}`,
      'Open',
    );
    if (open === 'Open') {
      await vscode.commands.executeCommand('vscode.open', target);
    }
  }
}

// ---------------------------------------------------------------------------
// HTML shell
// ---------------------------------------------------------------------------

function nonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

function formatOptionsHtml(): string {
  return formatsByGroup()
    .map(
      (group) =>
        `<optgroup label="${group.group}">` +
        group.formats
          .map((format) => `<option value="${format.id}">${escapeHtml(format.label)}</option>`)
          .join('') +
        '</optgroup>',
    )
    .join('');
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

export function renderHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const script = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'main.js'),
  );
  const style = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'viewer.css'));
  const csp = nonce();

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; img-src ${webview.cspSource} blob: data:; style-src ${webview.cspSource}; script-src 'nonce-${csp}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="${style}" rel="stylesheet">
  <title>Raw Image Viewer</title>
</head>
<body>
  <div class="toolbar">
    <div class="group">
      <label for="format">Format</label>
      <select id="format" title="Pixel format. Channel names are listed most-significant-bit first within the packed word.">${formatOptionsHtml()}</select>
    </div>

    <div class="group">
      <label for="width">Size</label>
      <input id="width" type="number" min="0" class="narrow" placeholder="auto" title="Width in pixels. Empty = guess from the buffer size.">
      <span>×</span>
      <input id="height" type="number" min="0" class="narrow" placeholder="auto" title="Height in pixels. Empty = use every remaining row.">
      <select id="guess" title="Plausible dimensions for this buffer size and format."></select>
    </div>

    <div class="group">
      <label for="offset">Offset</label>
      <input id="offset" type="number" min="0" class="narrow" value="0" title="Bytes skipped before the first pixel (header size).">
      <label for="stride">Stride</label>
      <input id="stride" type="number" min="0" class="narrow" placeholder="auto" title="Bytes per row including padding. Empty = tightly packed.">
    </div>

    <div class="group">
      <select id="endian" title="Byte order used to assemble packed 16/32-bit pixels.">
        <option value="le">little-endian</option>
        <option value="be">big-endian</option>
      </select>
      <span id="bitorder-group" class="hidden">
        <select id="bitorder" title="Which end of the byte holds the first pixel of a row.">
          <option value="msb">MSB first</option>
          <option value="lsb">LSB first</option>
        </select>
      </span>
    </div>

    <div class="group">
      <select id="alpha" title="How the alpha channel is treated.">
        <option value="use">use alpha</option>
        <option value="ignore">ignore alpha</option>
      </select>
      <label class="inline" title="Divide colour channels by alpha (for premultiplied buffers).">
        <input id="unpremul" type="checkbox"> un-premul
      </label>
      <label class="inline" title="Treat the first row in the buffer as the bottom row.">
        <input id="flipy" type="checkbox"> flip Y
      </label>
    </div>

    <div class="group">
      <select id="header" title="Read width/height from the first bytes of the file.">
        <option value="none">no size header</option>
        <option value="u16le">u16 LE w,h @0</option>
        <option value="u16be">u16 BE w,h @0</option>
        <option value="u32le">u32 LE w,h @0</option>
        <option value="u32be">u32 BE w,h @0</option>
      </select>
    </div>

    <div class="group">
      <select id="background" title="Backdrop drawn behind transparent pixels.">
        <option value="checker">checker</option>
        <option value="black">black</option>
        <option value="white">white</option>
        <option value="magenta">magenta</option>
        <option value="editor">editor</option>
      </select>
    </div>

    <div class="group">
      <button id="zoom-out" title="Zoom out (-)">−</button>
      <span id="zoom-level" class="zoom-level">100%</span>
      <button id="zoom-in" title="Zoom in (+)">+</button>
      <button id="zoom-fit" title="Fit to window (f)">fit</button>
      <button id="zoom-reset" title="Actual size (0)">1:1</button>
    </div>

    <div class="group hidden" id="frame-group">
      <label>Frame</label>
      <button id="frame-prev" title="Previous frame (←)">‹</button>
      <span id="frame-label" class="zoom-level">1 / 1</span>
      <button id="frame-next" title="Next frame (→)">›</button>
      <label class="inline" title="Show every frame in the buffer as a tile grid.">
        <input id="frame-tiles" type="checkbox"> tiles
      </label>
    </div>

    <div class="group hidden" id="tile-group">
      <label for="tile-size">Tile</label>
      <input id="tile-size" type="range" min="48" max="512" step="8" value="160">
    </div>

    <div class="group">
      <button id="export-png" class="primary" title="Save the decoded image as a PNG.">PNG</button>
    </div>
  </div>

  <div class="stage center" id="stage">
    <div class="surface bg-checker" id="surface"><canvas id="canvas"></canvas></div>
    <div class="grid hidden" id="grid"></div>
    <div class="empty hidden" id="empty">Loading buffer…</div>
  </div>

  <div class="status">
    <span id="status-geometry"></span>
    <span id="status-probe"></span>
    <span class="spacer"></span>
    <span id="status-note"></span>
  </div>

  <script nonce="${csp}" src="${script}"></script>
</body>
</html>`;
}
