import { BITS_PER_BYTE } from '@features/image/format/definitions';
import type { Rgba } from '@features/image/pixelProbe/types';
import type { SourceBytes, SourceLocation } from '@features/image/sourceReader/types';
import { StoreSliceId } from '@features/webview/store/definitions';
import type { PinnedProbeSample, PinnedSourceBytes, ProbeSample } from '@features/webview/store/slice/ProbeSlice';
import { byKind, type KindStrategies } from '@utils/strategy';

import type { StatusBarStateContext } from '../../../state/types';
import type { StatusBarEntry } from '../../types';

function toHex(value: number, digits: number): string {
  return value.toString(16).padStart(digits, '0');
}

// Will result in classic `#rrggbbaa`
function formatRgba({ r, g, b, a }: Rgba): string {
  return `#${[r, g, b, a].map((channel) => toHex(channel, 2)).join('')}`;
}

// Will result in `@0x1234+5`-like to represent the source byte
function formatLocation({ bits, byteOffset, bitOffset }: SourceLocation): string {
  const byte = `@0x${toHex(byteOffset, 4)}`;

  return bits < BITS_PER_BYTE ? `${byte}+${bitOffset}` : byte;
}

function formatSample({ position, rgba, location }: ProbeSample): string {
  return [
    `${position.x},${position.y}`,
    formatRgba(rgba),
    formatLocation(location),
  ].join(' · ');
}

export function resolveProbe({ appState }: StatusBarStateContext): StatusBarEntry | null {
  const { activeSample } = appState[StoreSliceId.Probe];

  return activeSample === null
    ? null
    : {
      level: 'info',
      text: formatSample(activeSample),
      sample: formatRgba(activeSample.rgba),
    };
}

function formatBytes({ bytes, value }: SourceBytes, bits: number): string {
  const read = bytes.map((byte) => toHex(byte, 2)).join(' ');

  return value === null
    ? 'unreadable'
    : `${read} = 0x${toHex(value, Math.ceil(bits / 4))}`;
}

/** Waiting says nothing of its own: the spinner is what tells the reader it is coming. */
const PINNED_BYTES: KindStrategies<PinnedSourceBytes, [bits: number], string | null> = {
  pending: () => null,
  failed: ({ message }) => message,
  received: ({ bytes }, bits) => formatBytes(bytes, bits),
};

export function resolvePinnedProbe({ appState }: StatusBarStateContext): StatusBarEntry | null {
  const pinned: PinnedProbeSample | null = appState[StoreSliceId.Probe].pinnedSample;

  if (pinned === null) {
    return null;
  }

  const read = byKind(PINNED_BYTES, pinned.sourceFileBytes, pinned.location.bits);

  return {
    sample: formatRgba(pinned.rgba),
    loading: pinned.sourceFileBytes.kind === 'pending',
    level: pinned.sourceFileBytes.kind === 'failed' ? 'error' : 'info',
    text: [formatSample(pinned), ...(read === null ? [] : [read])].join(' · '),
  };
}
