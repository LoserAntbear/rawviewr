import {
  DEFAULT_OPTIONS,
  decodeFrame,
  prepare,
  probePixel,
  suggestDimensions,
  type DecodeOptions,
  type DecodedImage,
  type Prepared,
} from '@common/decode';
import { getFormat } from '@common/formats';
import type {
  BufferItem,
  HostMessage,
  ViewerMode,
  ViewerSettings,
  WebviewMessage,
} from '@common/protocol';

declare function acquireVsCodeApi(): {
  postMessage(message: WebviewMessage): void;
  getState(): unknown;
  setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface Entry {
  item: BufferItem;
  buffer: Uint8Array | null;
  prepared: Prepared | null;
  /** Options the cached `prepared` was built with. */
  preparedKey: string;
}

let mode: ViewerMode = 'single';
let options: DecodeOptions = { ...DEFAULT_OPTIONS };
let settings: ViewerSettings = { background: 'checker', tileSize: 160 };
const entries = new Map<string, Entry>();
let order: string[] = [];
let selectedId: string | null = null;

let zoom = 1;
let fitToWindow = true;
let frameTiles = false;
let current: { entry: Entry; image: DecodedImage } | null = null;

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) {
    throw new Error(`missing element #${id}`);
  }
  return node as T;
}

const ui = {
  format: el<HTMLSelectElement>('format'),
  width: el<HTMLInputElement>('width'),
  height: el<HTMLInputElement>('height'),
  offset: el<HTMLInputElement>('offset'),
  stride: el<HTMLInputElement>('stride'),
  guess: el<HTMLSelectElement>('guess'),
  endian: el<HTMLSelectElement>('endian'),
  bitorder: el<HTMLSelectElement>('bitorder'),
  bitorderGroup: el<HTMLElement>('bitorder-group'),
  alpha: el<HTMLSelectElement>('alpha'),
  unpremul: el<HTMLInputElement>('unpremul'),
  flipy: el<HTMLInputElement>('flipy'),
  header: el<HTMLSelectElement>('header'),
  background: el<HTMLSelectElement>('background'),
  zoomOut: el<HTMLButtonElement>('zoom-out'),
  zoomIn: el<HTMLButtonElement>('zoom-in'),
  zoomLevel: el<HTMLElement>('zoom-level'),
  zoomFit: el<HTMLButtonElement>('zoom-fit'),
  zoomReset: el<HTMLButtonElement>('zoom-reset'),
  frameGroup: el<HTMLElement>('frame-group'),
  framePrev: el<HTMLButtonElement>('frame-prev'),
  frameNext: el<HTMLButtonElement>('frame-next'),
  frameLabel: el<HTMLElement>('frame-label'),
  frameTiles: el<HTMLInputElement>('frame-tiles'),
  tileGroup: el<HTMLElement>('tile-group'),
  tileSize: el<HTMLInputElement>('tile-size'),
  exportPng: el<HTMLButtonElement>('export-png'),
  stage: el<HTMLElement>('stage'),
  surface: el<HTMLElement>('surface'),
  canvas: el<HTMLCanvasElement>('canvas'),
  grid: el<HTMLElement>('grid'),
  empty: el<HTMLElement>('empty'),
  statusGeometry: el<HTMLElement>('status-geometry'),
  statusProbe: el<HTMLElement>('status-probe'),
  statusNote: el<HTMLElement>('status-note'),
};

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function hex(value: number, digits: number): string {
  return value.toString(16).toUpperCase().padStart(digits, '0');
}

function formatBytes(n: number): string {
  if (n < 1024) {
    return `${n} B`;
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(1)} KiB`;
  }
  return `${(n / (1024 * 1024)).toFixed(2)} MiB`;
}

/** Cache key for the container-unwrap step; only these fields affect it. */
function preparedKeyFor(o: DecodeOptions): string {
  return [o.headerPreset, o.format, o.width, o.height, o.offset, o.stride].join('|');
}

function preparedFor(entry: Entry): Prepared | null {
  if (!entry.buffer) {
    return null;
  }
  const key = preparedKeyFor(options);
  if (!entry.prepared || entry.preparedKey !== key) {
    entry.prepared = prepare(entry.buffer, options);
    entry.preparedKey = key;
  }
  return entry.prepared;
}

// The decoder always allocates plain ArrayBuffer-backed arrays; newer lib.dom
// typings narrow ImageData's parameter in a way that rejects the generic type.
const ImageDataCtor = ImageData as unknown as new (
  data: Uint8ClampedArray,
  width: number,
  height: number,
) => ImageData;

function toImageData(image: DecodedImage): ImageData {
  return new ImageDataCtor(image.data, image.width, image.height);
}

function paint(canvas: HTMLCanvasElement, image: DecodedImage): void {
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.putImageData(toImageData(image), 0, 0);
  }
}

// ---------------------------------------------------------------------------
// Option <-> UI binding
// ---------------------------------------------------------------------------

function numberValue(input: HTMLInputElement): number {
  const parsed = Number.parseInt(input.value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function readOptionsFromUi(): DecodeOptions {
  return {
    ...options,
    format: ui.format.value,
    width: numberValue(ui.width),
    height: numberValue(ui.height),
    offset: Math.max(0, Number.parseInt(ui.offset.value, 10) || 0),
    stride: numberValue(ui.stride),
    littleEndian: ui.endian.value === 'le',
    bitOrderMsb: ui.bitorder.value === 'msb',
    alphaMode: ui.alpha.value === 'ignore' ? 'ignore' : 'use',
    unpremultiply: ui.unpremul.checked,
    flipY: ui.flipy.checked,
    headerPreset: ui.header.value as DecodeOptions['headerPreset'],
  };
}

function applyOptionsToUi(): void {
  ui.format.value = options.format;
  ui.width.value = options.width ? String(options.width) : '';
  ui.height.value = options.height ? String(options.height) : '';
  ui.offset.value = String(options.offset);
  ui.stride.value = options.stride ? String(options.stride) : '';
  ui.endian.value = options.littleEndian ? 'le' : 'be';
  ui.bitorder.value = options.bitOrderMsb ? 'msb' : 'lsb';
  ui.alpha.value = options.alphaMode;
  ui.unpremul.checked = options.unpremultiply;
  ui.flipy.checked = options.flipY;
  ui.header.value = options.headerPreset;
  ui.background.value = settings.background;
  ui.tileSize.value = String(settings.tileSize);
  updateControlAvailability();
}

function updateControlAvailability(): void {
  const format = getFormat(options.format);
  ui.endian.disabled = !format.endianSensitive;
  ui.bitorderGroup.classList.toggle('hidden', !format.bitOrderSensitive);
  ui.unpremul.disabled = !format.hasAlpha || options.alphaMode === 'ignore';
  ui.alpha.disabled = !format.hasAlpha;

  // A container that carries its own geometry makes the manual fields moot.
  const geometryLocked = options.headerPreset !== 'none';

  ui.width.disabled = geometryLocked;
  ui.height.disabled = geometryLocked;
  ui.guess.disabled = geometryLocked;
  ui.width.placeholder = geometryLocked ? 'header' : 'auto';
  ui.height.placeholder = geometryLocked ? 'header' : 'auto';

  ui.tileGroup.classList.toggle('hidden', mode !== 'gallery' && !frameTiles);
}

function commitOptions(rerender = true): void {
  options = readOptionsFromUi();
  for (const entry of entries.values()) {
    entry.prepared = null;
  }
  updateControlAvailability();
  post({ type: 'optionsChanged', options });
  if (rerender) {
    scheduleRender();
  }
}

function post(message: WebviewMessage): void {
  vscode.postMessage(message);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

let renderHandle = 0;

function scheduleRender(): void {
  if (renderHandle) {
    return;
  }
  renderHandle = requestAnimationFrame(() => {
    renderHandle = 0;
    render();
  });
}

function render(): void {
  ui.stage.className = `stage ${mode === 'gallery' || frameTiles ? '' : 'center'}`;
  ui.grid.style.setProperty('--tile', `${settings.tileSize}px`);

  const anyLoaded = order.some((id) => entries.get(id)?.buffer);
  ui.empty.classList.toggle('hidden', anyLoaded);
  if (!anyLoaded) {
    // Gallery tiles carry their own per-file error, so only single view has to
    // surface a load failure here.
    const failures = order
      .map((id) => entries.get(id)?.item.error)
      .filter((error): error is string => !!error);
    ui.empty.textContent = failures.length ? failures.join('\n') : 'Loading buffer…';
    ui.empty.className = failures.length ? 'empty error' : 'empty';
    ui.surface.classList.add('hidden');
    ui.grid.classList.add('hidden');
    ui.statusGeometry.textContent = '';
    return;
  }

  if (mode === 'gallery') {
    renderGallery();
  } else if (frameTiles) {
    renderFrameTiles();
  } else {
    renderSingle();
  }
}

function backdropClass(): string {
  return `surface bg-${settings.background}`;
}

function renderSingle(): void {
  ui.grid.classList.add('hidden');
  ui.surface.classList.remove('hidden');
  ui.surface.className = backdropClass();

  const entry = entries.get(selectedId ?? order[0]);
  const prepared = entry ? preparedFor(entry) : null;
  if (!entry || !prepared) {
    return;
  }

  const geometry = prepared.geometry;
  options.frame = Math.max(0, Math.min(options.frame, geometry.frameCount - 1));
  const image = decodeFrame(prepared, options);
  current = { entry, image };
  paint(ui.canvas, image);

  if (fitToWindow) {
    const availableWidth = ui.stage.clientWidth - 32;
    const availableHeight = ui.stage.clientHeight - 32;
    zoom = Math.min(availableWidth / image.width, availableHeight / image.height);
    if (!Number.isFinite(zoom) || zoom <= 0) {
      zoom = 1;
    }
    zoom = Math.min(zoom, 32);
  }
  ui.canvas.style.width = `${Math.max(1, Math.round(image.width * zoom))}px`;
  ui.canvas.style.height = `${Math.max(1, Math.round(image.height * zoom))}px`;
  ui.zoomLevel.textContent = zoom >= 1 ? `${Math.round(zoom * 100)}%` : `${(zoom * 100).toFixed(1)}%`;

  updateFrameControls(geometry.frameCount);
  updateStatus(entry, prepared);
}

function renderFrameTiles(): void {
  const entry = entries.get(selectedId ?? order[0]);
  const prepared = entry ? preparedFor(entry) : null;
  if (!entry || !prepared) {
    return;
  }
  ui.surface.classList.add('hidden');
  ui.grid.classList.remove('hidden');
  ui.grid.replaceChildren();

  const geometry = prepared.geometry;
  const max = Math.min(geometry.frameCount, 4096);
  for (let frame = 0; frame < max; frame++) {
    const image = decodeFrame(prepared, options, frame);
    ui.grid.append(
      buildTile({
        title: `frame ${frame}`,
        meta: `${image.width}×${image.height}`,
        image,
        selected: frame === options.frame,
        onClick: () => {
          options.frame = frame;
          frameTiles = false;
          ui.frameTiles.checked = false;
          scheduleRender();
        },
      }),
    );
  }
  updateFrameControls(geometry.frameCount);
  updateStatus(entry, prepared);
}

function renderGallery(): void {
  ui.surface.classList.add('hidden');
  ui.grid.classList.remove('hidden');
  ui.grid.replaceChildren();

  let decoded = 0;
  for (const id of order) {
    const entry = entries.get(id);
    if (!entry) {
      continue;
    }
    if (entry.item.error || !entry.buffer) {
      ui.grid.append(
        buildTile({
          title: entry.item.name,
          meta: formatBytes(entry.item.byteLength),
          error: entry.item.error ?? 'loading…',
          selected: id === selectedId,
          onClick: () => selectTile(id),
        }),
      );
      continue;
    }
    const prepared = preparedFor(entry);
    if (!prepared) {
      continue;
    }
    const image = decodeFrame(prepared, options, 0);
    decoded++;
    ui.grid.append(
      buildTile({
        title: entry.item.name,
        meta: `${image.width}×${image.height} · ${formatBytes(entry.item.byteLength)}${
          prepared.geometry.frameCount > 1 ? ` · ${prepared.geometry.frameCount} frames` : ''
        }`,
        detail: entry.item.detail,
        image,
        selected: id === selectedId,
        onClick: () => selectTile(id),
        onDoubleClick: () => post({ type: 'openItem', id }),
      }),
    );
  }

  ui.frameGroup.classList.add('hidden');
  ui.statusGeometry.textContent = `${decoded} / ${order.length} buffers · ${getFormat(
    options.format,
  ).label}`;
  ui.statusNote.textContent = 'double-click a tile to open it on its own';
  ui.statusNote.className = '';
}

interface TileSpec {
  title: string;
  meta: string;
  detail?: string;
  image?: DecodedImage;
  error?: string;
  selected: boolean;
  onClick: () => void;
  onDoubleClick?: () => void;
}

function buildTile(spec: TileSpec): HTMLElement {
  const tile = document.createElement('div');
  tile.className = `tile${spec.selected ? ' selected' : ''}`;
  if (spec.detail) {
    tile.title = spec.detail;
  }

  const holder = document.createElement('div');
  holder.className = `tile-canvas bg-${settings.background}`;
  if (spec.image) {
    const canvas = document.createElement('canvas');
    paint(canvas, spec.image);
    holder.append(canvas);
  }
  tile.append(holder);

  const name = document.createElement('div');
  name.className = 'tile-name';
  name.textContent = spec.title;
  tile.append(name);

  const meta = document.createElement('div');
  meta.className = spec.error ? 'tile-error' : 'tile-meta';
  meta.textContent = spec.error ?? spec.meta;
  tile.append(meta);

  tile.addEventListener('click', spec.onClick);
  if (spec.onDoubleClick) {
    tile.addEventListener('dblclick', spec.onDoubleClick);
  }
  return tile;
}

function selectTile(id: string): void {
  selectedId = id;
  scheduleRender();
}

function updateFrameControls(frameCount: number): void {
  // A format/size change can collapse a multi-frame buffer down to one frame,
  // which would otherwise strand the tile view behind a hidden checkbox.
  if (frameCount <= 1 && frameTiles) {
    frameTiles = false;
    ui.frameTiles.checked = false;
  }
  ui.frameGroup.classList.toggle('hidden', frameCount <= 1);
  ui.frameLabel.textContent = `${options.frame + 1} / ${frameCount}`;
  ui.framePrev.disabled = options.frame <= 0;
  ui.frameNext.disabled = options.frame >= frameCount - 1;
}

function updateStatus(entry: Entry, prepared: Prepared): void {
  const { geometry } = prepared;
  const format = getFormat(options.format);
  const used = geometry.bytesPerFrame * geometry.frameCount;
  const leftover = geometry.availableBytes - used;

  ui.statusGeometry.textContent = [
    `${geometry.width}×${geometry.height}`,
    format.label.split(' — ')[0],
    `${geometry.bytesPerRow} B/row`,
    formatBytes(entry.item.byteLength),
  ].join(' · ');

  const notes: string[] = [];
  if (geometry.note) {
    notes.push(geometry.note);
  }
  if (leftover > 0) {
    notes.push(`${formatBytes(leftover)} trailing bytes unused`);
  }
  if (geometry.availableBytes < geometry.bytesPerFrame) {
    notes.push('buffer is smaller than one frame — padded with transparent pixels');
  }
  ui.statusNote.textContent = notes.join(' · ');
  ui.statusNote.className = notes.length && leftover < 0 ? 'warn' : '';
}

// ---------------------------------------------------------------------------
// Pixel probe
// ---------------------------------------------------------------------------

function handleProbe(event: MouseEvent): void {
  if (!current) {
    return;
  }
  const rect = ui.canvas.getBoundingClientRect();
  const x = Math.floor(((event.clientX - rect.left) / rect.width) * current.image.width);
  const y = Math.floor(((event.clientY - rect.top) / rect.height) * current.image.height);
  const prepared = current.entry.prepared;
  if (!prepared || x < 0 || y < 0 || x >= current.image.width || y >= current.image.height) {
    ui.statusProbe.textContent = '';
    return;
  }

  const index = (y * current.image.width + x) * 4;
  const [r, g, b, a] = [
    current.image.data[index],
    current.image.data[index + 1],
    current.image.data[index + 2],
    current.image.data[index + 3],
  ];
  const probe = probePixel(prepared, options, x, y);
  const raw =
    probe && probe.value !== null
      ? probe.bits < 8
        ? `${hex(probe.value, 1)}b @0x${hex(probe.byteOffset, 4)}.${probe.bitOffset}`
        : `0x${hex(probe.value, probe.bits / 4)} @0x${hex(probe.byteOffset, 4)}`
      : 'out of range';

  ui.statusProbe.innerHTML = '';
  const swatch = document.createElement('span');
  swatch.className = 'swatch';
  swatch.style.background = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
  ui.statusProbe.append(swatch);
  ui.statusProbe.append(
    document.createTextNode(`(${x}, ${y}) rgba(${r}, ${g}, ${b}, ${a}) · ${raw}`),
  );
}

// ---------------------------------------------------------------------------
// Dimension guesses
// ---------------------------------------------------------------------------

function refreshGuesses(): void {
  const entry = entries.get(selectedId ?? order[0]);
  const prepared = entry ? preparedFor(entry) : null;
  ui.guess.replaceChildren();

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'guess size…';
  ui.guess.append(placeholder);

  if (!prepared) {
    return;
  }
  for (const guess of suggestDimensions(prepared.geometry.availableBytes, options.format)) {
    const option = document.createElement('option');
    option.value = `${guess.width}x${guess.height}`;
    option.textContent = `${guess.width}×${guess.height}${guess.exact ? '' : ' ~'}`;
    option.title = `${guess.reason}${guess.exact ? ', consumes the buffer exactly' : ''}`;
    ui.guess.append(option);
  }
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

function setZoom(next: number, fit = false): void {
  fitToWindow = fit;
  zoom = Math.max(0.05, Math.min(64, next));
  scheduleRender();
}

for (const control of [
  ui.format,
  ui.width,
  ui.height,
  ui.offset,
  ui.stride,
  ui.endian,
  ui.bitorder,
  ui.alpha,
  ui.header,
]) {
  control.addEventListener('change', () => {
    commitOptions();
    refreshGuesses();
  });
}
for (const control of [ui.width, ui.height, ui.offset, ui.stride]) {
  control.addEventListener('input', () => commitOptions());
}
for (const control of [ui.unpremul, ui.flipy]) {
  control.addEventListener('change', () => commitOptions());
}

ui.guess.addEventListener('change', () => {
  const value = ui.guess.value;
  if (!value) {
    return;
  }
  const [width, height] = value.split('x');
  ui.width.value = width;
  ui.height.value = height;
  ui.guess.value = '';
  commitOptions();
});

ui.background.addEventListener('change', () => {
  settings = { ...settings, background: ui.background.value as ViewerSettings['background'] };
  scheduleRender();
});

ui.tileSize.addEventListener('input', () => {
  settings = { ...settings, tileSize: Number.parseInt(ui.tileSize.value, 10) || 160 };
  scheduleRender();
});

ui.zoomIn.addEventListener('click', () => setZoom(zoom < 1 ? zoom * 2 : zoom + 1));
ui.zoomOut.addEventListener('click', () => setZoom(zoom <= 1 ? zoom / 2 : zoom - 1));
ui.zoomFit.addEventListener('click', () => setZoom(zoom, true));
ui.zoomReset.addEventListener('click', () => setZoom(1));

ui.framePrev.addEventListener('click', () => {
  options.frame = Math.max(0, options.frame - 1);
  post({ type: 'optionsChanged', options });
  scheduleRender();
});
ui.frameNext.addEventListener('click', () => {
  options.frame += 1;
  post({ type: 'optionsChanged', options });
  scheduleRender();
});
ui.frameTiles.addEventListener('change', () => {
  frameTiles = ui.frameTiles.checked;
  updateControlAvailability();
  scheduleRender();
});

ui.exportPng.addEventListener('click', () => exportPng());

ui.canvas.addEventListener('mousemove', handleProbe);
ui.canvas.addEventListener('mouseleave', () => {
  ui.statusProbe.textContent = '';
});

ui.stage.addEventListener(
  'wheel',
  (event) => {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }
    event.preventDefault();
    setZoom(zoom * (event.deltaY < 0 ? 1.15 : 1 / 1.15));
  },
  { passive: false },
);

window.addEventListener('resize', () => {
  if (fitToWindow) {
    scheduleRender();
  }
});

window.addEventListener('keydown', (event) => {
  const target = event.target as HTMLElement | null;
  if (target && /INPUT|SELECT|TEXTAREA/.test(target.tagName)) {
    return;
  }
  switch (event.key) {
    case 'ArrowLeft':
      ui.framePrev.click();
      break;
    case 'ArrowRight':
      ui.frameNext.click();
      break;
    case '+':
    case '=':
      ui.zoomIn.click();
      break;
    case '-':
      ui.zoomOut.click();
      break;
    case '0':
      ui.zoomReset.click();
      break;
    case 'f':
      ui.zoomFit.click();
      break;
    default:
      return;
  }
  event.preventDefault();
});

function exportPng(): void {
  const entry = entries.get(selectedId ?? order[0]);
  if (!entry) {
    return;
  }
  const prepared = preparedFor(entry);
  if (!prepared) {
    return;
  }
  const image = decodeFrame(prepared, options);
  const canvas = document.createElement('canvas');
  paint(canvas, image);
  const dataUrl = canvas.toDataURL('image/png');
  const base = entry.item.name.replace(/\.[^.]+$/, '');
  const suffix = prepared.geometry.frameCount > 1 ? `_f${options.frame}` : '';
  post({
    type: 'png',
    name: `${base}${suffix}_${options.format}_${image.width}x${image.height}.png`,
    base64: dataUrl.slice(dataUrl.indexOf(',') + 1),
  });
}

// ---------------------------------------------------------------------------
// Host messages
// ---------------------------------------------------------------------------

function upsertItem(item: BufferItem): void {
  const existing = entries.get(item.id);
  const entry: Entry = existing ?? {
    item,
    buffer: null,
    prepared: null,
    preparedKey: '',
  };
  entry.item = item;
  if (item.base64 !== undefined) {
    entry.buffer = fromBase64(item.base64);
    entry.prepared = null;
  }
  entries.set(item.id, entry);
  if (!order.includes(item.id)) {
    order.push(item.id);
  }
}

window.addEventListener('message', (event: MessageEvent<HostMessage>) => {
  const message = event.data;
  switch (message.type) {
    case 'init': {
      mode = message.mode;
      options = { ...DEFAULT_OPTIONS, ...message.options };
      settings = message.settings;
      entries.clear();
      order = [];
      for (const item of message.items) {
        upsertItem(item);
      }
      selectedId = order[0] ?? null;
      applyOptionsToUi();
      refreshGuesses();
      scheduleRender();
      break;
    }
    case 'item': {
      upsertItem(message.item);
      if (!selectedId) {
        selectedId = message.item.id;
      }
      refreshGuesses();
      scheduleRender();
      break;
    }
    case 'settings': {
      settings = message.settings;
      applyOptionsToUi();
      scheduleRender();
      break;
    }
    case 'options': {
      options = { ...options, ...message.options };
      for (const entry of entries.values()) {
        entry.prepared = null;
      }
      applyOptionsToUi();
      refreshGuesses();
      scheduleRender();
      break;
    }
    case 'exportPng': {
      exportPng();
      break;
    }
  }
});

post({ type: 'ready' });
