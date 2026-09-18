import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { FormatRegistry } from '@features/image/format/FormatRegistry';
import { FORMAT_PRESETS } from '@features/image/format/presets';
import { DEFAULT_DECODE_OPTIONS, HeaderPreset } from '@features/image/imageDecoder/definitions';
import { RIV_COMMAND_EVENT_ID, WebviewCommandType } from '@features/webview/commands/definitions';
import type { WebviewCommand } from '@features/webview/commands/types';
import { createWebviewStore } from '@features/webview/store/createWebviewStore';
import { StoreSliceId } from '@features/webview/store/definitions';
import type { AppStore } from '@features/webview/store/types';
import { WebviewContextProvider } from '@features/webview/webviewContext/WebviewContextProvider';

import { RIVToolbar } from './index';

/**
 * The toolbar mounted as a real custom element, driven the way a user drives it.
 *
 * Every control change goes the whole way: a real `change` event inside the shadow root,
 * the delegated listener, `readElementValue`, the value-control registry, the option patch,
 * `decode:change`, and the re-render. This is the path the checkbox-only bug lived on.
 */

let store: AppStore;
let formatRegistry: FormatRegistry;
let toolbar: RIVToolbar;

beforeAll(() => {
  formatRegistry = new FormatRegistry(FORMAT_PRESETS, DEFAULT_DECODE_OPTIONS.format);
  ({ store } = createWebviewStore(formatRegistry));

  WebviewContextProvider.create({ store, formatRegistry });
  customElements.define(RIVToolbar.tagName, RIVToolbar);
});

beforeEach(() => {
  store.get(StoreSliceId.Decode).reset();

  toolbar = document.createElement(RIVToolbar.tagName) as RIVToolbar;
  document.body.replaceChildren(toolbar);
});

const options = () => store.get(StoreSliceId.Decode).options;

function control<T extends HTMLElement>(id: string): T {
  const element = toolbar.shadowRoot?.getElementById(id);

  if (!element) {
    throw new Error(`riv-toolbar has no control #${id}`);
  }

  return element as T;
}

function fieldOf(id: string): HTMLElement {
  return control(id).closest('.field') as HTMLElement;
}

/** A `change` as a browser fires it: bubbling, but not composed out of the shadow root. */
function fireChange(element: HTMLElement): void {
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Selects an option rather than assigning `.value` — see `ElementBuilder/utils.test.ts`. */
function pick(id: string, value: string): void {
  const select = control<HTMLSelectElement>(id);

  for (const option of select.options) {
    option.selected = option.value === value;
  }

  fireChange(select);
}

function type(id: string, value: string): void {
  const input = control<HTMLInputElement>(id);

  input.value = value;
  fireChange(input);
}

function toggle(id: string): void {
  const box = control<HTMLInputElement>(id);

  box.checked = !box.checked;
  fireChange(box);
}

describe('riv-toolbar: controls write to the store', () => {
  /**
   * Known blind spot: this cannot catch code that probes `Object.hasOwn(select, 'value')`.
   * happy-dom wraps selects in a Proxy whose method binder copies `value` onto the instance
   * the first time it is read or written — and the toolbar's own render reads it. Browsers
   * never do that. `ElementBuilder/utils.test.ts` covers the case, because there the
   * function under test is the first thing to touch the element.
   */
  it('a dropdown updates its option', () => {
    pick('format', 'rgb565');

    expect(options().format).toBe('rgb565');
  });

  it('a number input updates its option', () => {
    type('width', '640');

    expect(options().width).toBe(640);
  });

  it('a checkbox updates its option', () => {
    toggle('flipY');

    expect(options().flipY).toBe(true);
  });

  it('anything unparseable in a number field means "auto"', () => {
    type('width', '640');
    type('width', 'abc');

    expect(options().width).toBe(0);
  });
});

describe('riv-toolbar: the store writes to the controls', () => {
  it('reflects options changed from elsewhere', () => {
    store.get(StoreSliceId.Decode).setOptions({ format: 'bgra8888', width: 320, flipY: true });

    expect(control<HTMLSelectElement>('format').value).toBe('bgra8888');
    expect(control<HTMLInputElement>('width').value).toBe('320');
    expect(control<HTMLInputElement>('flipY').checked).toBe(true);
  });

  it('shows the bit-order control only for formats that care about it', () => {
    const subByte = formatRegistry.list().find((format) => format.bitOrderSensitive);
    const packed = formatRegistry.list().find((format) => !format.bitOrderSensitive);

    pick('format', subByte!.id);
    expect(fieldOf('bitOrderMsb').hidden).toBe(false);

    pick('format', packed!.id);
    expect(fieldOf('bitOrderMsb').hidden).toBe(true);
  });

  it('locks width and height when a header preset supplies them', () => {
    pick('headerPreset', HeaderPreset.U16LE);

    expect(control<HTMLInputElement>('width').disabled).toBe(true);
    expect(control<HTMLInputElement>('width').placeholder).toBe('header');

    pick('headerPreset', HeaderPreset.None);

    expect(control<HTMLInputElement>('width').disabled).toBe(false);
    expect(control<HTMLInputElement>('width').placeholder).toBe('auto');
  });
});

describe('riv-toolbar: actions', () => {
  it('the export button emits its command and leaves the options alone', () => {
    const emitted: WebviewCommand[] = [];
    const before = options();

    document.addEventListener(RIV_COMMAND_EVENT_ID, (event) => {
      emitted.push((event as CustomEvent<WebviewCommand>).detail);
    });

    control<HTMLButtonElement>('exportPng').click();

    expect(emitted.filter((command) => command.type === WebviewCommandType.ExportRequest)).toHaveLength(1);
    expect(options()).toBe(before);
  });
});
