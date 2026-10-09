import { Endian } from '@definitions/bits';
import { AlphaMode, HeaderPreset } from '@features/image/imageDecoder/definitions';


import { ViewerBackground } from '@features/viewer/definitions';

import { ToolbarGroup } from '../definitions';
import type { DecodeOptions } from '@features/image/imageDecoder/types';
import type { WebviewMessage } from '@features/webview/webviewHost/types';

import { ToolbarControl } from './types';
import { TAG_DESCRIPTORS } from './tagDescriptors';

function decodeOptionsUpdate(options: Partial<DecodeOptions>): WebviewMessage {
  return { type: 'decode:options:update', options };
}

function toDimension(raw: string): number {
  const parsed = Number.parseInt(raw, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function fromDimension(value: number): string {
  return value > 0 ? String(value) : '';
}

function toggled(raw: string): boolean {
  return raw === 'true';
}

function fromToggle(value: boolean): string {
  return value ? 'true' : '';
}

export const TOOLBAR_CONTROLS: readonly ToolbarControl[] = [
  {
    id: 'format',
    label: 'Format',
    group: ToolbarGroup.Format,
    tag: TAG_DESCRIPTORS.buildFormatFieldTagDescriptor(),
    tooltip: 'How the bytes are laid out per pixel.',
    toValue: ({ options }) => options.format.id,
    toCommand: (raw, { formats }) => decodeOptionsUpdate({ format: formats.get(raw) }),
  },
  {
    id: 'width',
    label: 'Width',
    group: ToolbarGroup.Geometry,
    tag: TAG_DESCRIPTORS.NUMBER_FIELD,
    toValue: ({ options }) => fromDimension(options.width),
    toCommand: (raw) => decodeOptionsUpdate({ width: toDimension(raw) }),
  },
  {
    id: 'height',
    label: 'Height',
    group: ToolbarGroup.Geometry,
    tag: TAG_DESCRIPTORS.NUMBER_FIELD,
    toValue: ({ options }) => fromDimension(options.height),
    toCommand: (raw) => decodeOptionsUpdate({ height: toDimension(raw) }),
  },
  {
    id: 'offset',
    label: 'Offset',
    group: ToolbarGroup.Geometry,
    tag: TAG_DESCRIPTORS.NUMBER_FIELD,
    tooltip: 'Bytes to skip before the first pixel.',
    toValue: ({ options }) => fromDimension(options.offset),
    toCommand: (raw) => decodeOptionsUpdate({ offset: toDimension(raw) }),
  },
  {
    id: 'bytesPerRow',
    label: 'Stride',
    group: ToolbarGroup.Geometry,
    tag: TAG_DESCRIPTORS.NUMBER_FIELD,
    tooltip: 'Bytes per row including padding. Empty means tightly packed.',
    toValue: ({ options }) => fromDimension(options.bytesPerRow),
    toCommand: (raw) => decodeOptionsUpdate({ bytesPerRow: toDimension(raw) }),
  },
  {
    id: 'endian',
    label: 'Endian',
    group: ToolbarGroup.Layout,
    tag: TAG_DESCRIPTORS.buildSelectFieldTagDescriptor([
      { value: Endian.Little, label: 'little' },
      { value: Endian.Big, label: 'big' },
    ]),
    toValue: ({ options }) => options.endian,
    toCommand: (raw) => decodeOptionsUpdate({ endian: raw as Endian }),
  },
  {
    id: 'bitOrderMsb',
    label: 'Bit order',
    group: ToolbarGroup.Layout,
    tag: TAG_DESCRIPTORS.buildSelectFieldTagDescriptor([
      { value: 'true', label: 'MSB first' },
      { value: '', label: 'LSB first' },
    ]),
    tooltip: 'For sub-byte formats: which end of the byte the first pixel sits in.',
    toValue: ({ options }) => fromToggle(options.bitOrderMsb),
    toCommand: (raw) => decodeOptionsUpdate({ bitOrderMsb: toggled(raw) }),
  },
  {
    id: 'flipY',
    label: 'Flip Y',
    group: ToolbarGroup.Layout,
    tag: TAG_DESCRIPTORS.TOGGLE_FIELD,
    tooltip: 'Bottom-up buffers, as most GPU captures are.',
    toValue: ({ options }) => fromToggle(options.flipY),
    toCommand: (raw) => decodeOptionsUpdate({ flipY: toggled(raw) }),
  },
  {
    id: 'alphaMode',
    label: 'Alpha',
    group: ToolbarGroup.Alpha,
    tag: TAG_DESCRIPTORS.buildSelectFieldTagDescriptor([
      { value: AlphaMode.Use, label: 'use' },
      { value: AlphaMode.Ignore, label: 'ignore' },
    ]),
    toValue: ({ options }) => options.alphaMode,
    toCommand: (raw) => decodeOptionsUpdate({ alphaMode: raw as AlphaMode }),
  },
  {
    id: 'unpremultiply',
    label: 'Un-premul',
    group: ToolbarGroup.Alpha,
    tag: TAG_DESCRIPTORS.TOGGLE_FIELD,
    tooltip: 'Divide colour back out by alpha.',
    toValue: ({ options }) => fromToggle(options.unpremultiply),
    toCommand: (raw) => decodeOptionsUpdate({ unpremultiply: toggled(raw) }),
  },
  {
    id: 'headerPreset',
    label: 'Header',
    group: ToolbarGroup.Header,
    tag: TAG_DESCRIPTORS.buildSelectFieldTagDescriptor([
      { value: HeaderPreset.None, label: 'none' },
      { value: HeaderPreset.U16LE, label: 'u16 LE' },
      { value: HeaderPreset.U16BE, label: 'u16 BE' },
      { value: HeaderPreset.U32LE, label: 'u32 LE' },
      { value: HeaderPreset.U32BE, label: 'u32 BE' },
    ]),
    tooltip: 'Read width and height from a header instead of the fields.',
    toValue: ({ options }) => options.headerPreset,
    toCommand: (raw) => decodeOptionsUpdate({ headerPreset: raw as HeaderPreset }),
  },
  {
    id: 'background',
    label: 'Background',
    group: ToolbarGroup.View,
    tag: TAG_DESCRIPTORS.buildSelectFieldTagDescriptor([
      { value: ViewerBackground.checker, label: 'checker' },
      { value: ViewerBackground.black, label: 'black' },
      { value: ViewerBackground.white, label: 'white' },
      { value: ViewerBackground.magenta, label: 'magenta' },
      { value: ViewerBackground.editor, label: 'editor' },
    ]),
    tooltip: 'What is painted behind transparent pixels. The setting only picks what a view opens with.',
    toValue: ({ background }) => background,
    toCommand: (raw) => ({ type: 'view:background:update', background: raw as ViewerBackground }),
  },
  {
    id: 'zoomOut',
    label: '−',
    group: ToolbarGroup.View,
    tag: TAG_DESCRIPTORS.BUTTON_FIELD,
    toCommand: () => ({ type: 'view:zoom', direction: 'out' }),
    tooltip: 'Zoom out',
  },
  {
    id: 'zoomReset',
    label: '1:1',
    group: ToolbarGroup.View,
    tag: TAG_DESCRIPTORS.BUTTON_FIELD,
    toCommand: () => ({ type: 'view:zoom', direction: 'reset' }),
    tooltip: 'Back to one screen pixel per image pixel.',
  },
  {
    id: 'zoomIn',
    label: '+',
    group: ToolbarGroup.View,
    tag: TAG_DESCRIPTORS.BUTTON_FIELD,
    toCommand: () => ({ type: 'view:zoom', direction: 'in' }),
    tooltip: 'Zoom in',
  },
  {
    id: 'exportPng',
    label: 'Export PNG',
    group: ToolbarGroup.Actions,
    tag: TAG_DESCRIPTORS.BUTTON_FIELD,
    toCommand: () => ({ type: 'export:request' }),
    tooltip: 'Save what is on screen as a PNG.',
  },
];
