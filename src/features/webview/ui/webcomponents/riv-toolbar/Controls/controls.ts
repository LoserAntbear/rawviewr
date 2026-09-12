import { Endian } from '@definitions/bits';
import { AlphaMode, HeaderPreset } from '@features/image/imageDecoder/definitions';

import { ToolbarGroup } from '../definitions';
import { TAG_DESCRIPTORS } from './tagDescriptors';
import { ToolbarControl } from '../types';

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
    toRawValue: (options) => options.format,
    toDecodeOptions: (raw) => ({ format: raw }),
  },
  {
    id: 'width',
    label: 'Width',
    group: ToolbarGroup.Geometry,
    tag: TAG_DESCRIPTORS.NUMBER_FIELD,
    toRawValue: (options) => fromDimension(options.width),
    toDecodeOptions: (raw) => ({ width: toDimension(raw) }),
  },
  {
    id: 'height',
    label: 'Height',
    group: ToolbarGroup.Geometry,
    tag: TAG_DESCRIPTORS.NUMBER_FIELD,
    toRawValue: (options) => fromDimension(options.height),
    toDecodeOptions: (raw) => ({ height: toDimension(raw) }),
  },
  {
    id: 'offset',
    label: 'Offset',
    group: ToolbarGroup.Geometry,
    tag: TAG_DESCRIPTORS.NUMBER_FIELD,
    tooltip: 'Bytes to skip before the first pixel.',
    toRawValue: (options) => fromDimension(options.offset),
    toDecodeOptions: (raw) => ({ offset: toDimension(raw) }),
  },
  {
    id: 'bytesPerRow',
    label: 'Stride',
    group: ToolbarGroup.Geometry,
    tag: TAG_DESCRIPTORS.NUMBER_FIELD,
    tooltip: 'Bytes per row including padding. Empty means tightly packed.',
    toRawValue: (options) => fromDimension(options.bytesPerRow),
    toDecodeOptions: (raw) => ({ bytesPerRow: toDimension(raw) }),
  },
  {
    id: 'endian',
    label: 'Endian',
    group: ToolbarGroup.Layout,
    tag: TAG_DESCRIPTORS.buildSelectFieldTagDescriptor([
      { value: Endian.Little, label: 'little' },
      { value: Endian.Big, label: 'big' },
    ]),
    toRawValue: (options) => options.endian,
    toDecodeOptions: (raw) => ({ endian: raw as Endian }),
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
    toRawValue: (options) => fromToggle(options.bitOrderMsb),
    toDecodeOptions: (raw) => ({ bitOrderMsb: toggled(raw) }),
  },
  {
    id: 'flipY',
    label: 'Flip Y',
    group: ToolbarGroup.Layout,
    tag: TAG_DESCRIPTORS.TOGGLE_FIELD,
    tooltip: 'Bottom-up buffers, as most GPU captures are.',
    toRawValue: (options) => fromToggle(options.flipY),
    toDecodeOptions: (raw) => ({ flipY: toggled(raw) }),
  },
  {
    id: 'alphaMode',
    label: 'Alpha',
    group: ToolbarGroup.Alpha,
    tag: TAG_DESCRIPTORS.buildSelectFieldTagDescriptor([
      { value: AlphaMode.Use, label: 'use' },
      { value: AlphaMode.Ignore, label: 'ignore' },
    ]),
    toRawValue: (options) => options.alphaMode,
    toDecodeOptions: (raw) => ({ alphaMode: raw as AlphaMode }),
  },
  {
    id: 'unpremultiply',
    label: 'Un-premul',
    group: ToolbarGroup.Alpha,
    tag: TAG_DESCRIPTORS.TOGGLE_FIELD,
    tooltip: 'Divide colour back out by alpha.',
    toRawValue: (options) => fromToggle(options.unpremultiply),
    toDecodeOptions: (raw) => ({ unpremultiply: toggled(raw) }),
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
    toRawValue: (options) => options.headerPreset,
    toDecodeOptions: (raw) => ({ headerPreset: raw as HeaderPreset }),
  },
];

export const TOOLBAR_CONTROLS_BY_ID: ReadonlyMap<string, ToolbarControl> = new Map(
  TOOLBAR_CONTROLS.map((control) => [control.id, control]),
);
