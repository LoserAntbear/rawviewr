import { expandTable } from '@utils/bits';
import { RowChannel } from '../definitions';
import { ChannelReader, Field, PackedChannels } from '../types';

export function buildEmptyRow(pixelCount: number): Uint8ClampedArray {
  return new Uint8ClampedArray(pixelCount * 4);
}

export function buildLabel(id: string, detail?: string): string {
  const name = id.toUpperCase();

  return detail ? `${name} — ${detail}` : name;
}

function buildChannelReader(field: Field, rowIndexShift: RowChannel): ChannelReader {
  return {
    rowIndexShift,
    wordShift: field.shift,
    mask: (1 << field.bits) - 1,
    table: expandTable(field.bits),
  };
}

export function buildChannelReaders(spec: PackedChannels): readonly ChannelReader[] {
  const readers = [
    buildChannelReader(spec.r, RowChannel.Red),
    buildChannelReader(spec.g, RowChannel.Green),
    buildChannelReader(spec.b, RowChannel.Blue),
  ];

  if (spec.a) {
    readers.push(buildChannelReader(spec.a, RowChannel.Alpha));
  }

  return readers;
}
