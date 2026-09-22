import type { Geometry } from '@features/image/imageDecoder/imagePreparation/types';
import { isPresent } from '@guards/valueGuards';
import { StringFormat } from '@utils/string/formatters';

import type { StatusBarEntry, StatusLevel } from '../../types';
import type { StatusBarStateContext } from '../../../state/types';
import { byMode, byDisplayedItem } from '../strategies';
import type { ModeStrategies, DisplayedItemStrategies } from '../types';
import { isReadyImageItem } from '@features/webview/store/slice/ImagesSlice/utils';

type GeometryNoteRule = (geometry: Geometry) => StatusBarEntry | null;

const GALLERY_HINT: StatusBarEntry = { text: 'double-click a tile to open it on its own', level: 'info' };
const GEOMETRY_NOTE_RULES: readonly GeometryNoteRule[] = [
  (geometry) => (leftoverBytes(geometry) < 0
    ? { text: 'buffer is smaller than one frame — padded with transparent pixels', level: 'warn' }
    : null),
  (geometry) => {
    const leftover = leftoverBytes(geometry);

    return leftover > 0
      ? { text: `${StringFormat.bytes(leftover)} trailing bytes unused`, level: 'info' }
      : null;
  },
];
/**
 * Every strategy yields a list — possibly empty — so the segment combines once rather than
 * each branch deciding for itself whether it has anything to say.
 */
const NOTES_BY_DISPLAYED_ITEM: DisplayedItemStrategies<readonly StatusBarEntry[]> = {
  none: () => [],
  loading: () => [],
  failed: ({ message }) => [{ text: message, level: 'error' }],
  resolved: ({ item }) => {
    if (!isReadyImageItem(item)) {
      return [];
    }

    return GEOMETRY_NOTE_RULES.map((rule) => rule(item.geometry)).filter(isPresent);
  } ,
};

const NOTES_BY_MODE: ModeStrategies<readonly StatusBarEntry[]> = {
  single: (context) => byDisplayedItem(NOTES_BY_DISPLAYED_ITEM, context),
  gallery: () => [GALLERY_HINT],
};

const LEVEL_WEIGHT: Readonly<Record<StatusLevel, number>> = { info: 0, warn: 1, error: 2 };

/** Negative only when the buffer cannot fill a single frame: frame count is floored at 1. */
function leftoverBytes(geometry: Geometry): number {
  return geometry.availableBytes - geometry.bytesPerFrame * geometry.frameCount;
}

function mostSevere(notes: readonly StatusBarEntry[]): StatusLevel {
  return notes.reduce<StatusLevel>(
    (worst, note) => (LEVEL_WEIGHT[note.level] > LEVEL_WEIGHT[worst] ? note.level : worst),
    'info',
  );
}

// Combines multiple notes into a single entry, taking the most severe level among them.
function joinNotes(notes: readonly StatusBarEntry[]): StatusBarEntry | null {
  return notes.length === 0
    ? null
    : { text: notes.map((note) => note.text).join(' · '), level: mostSevere(notes) };
}

export function resolveNotes(context: StatusBarStateContext): StatusBarEntry | null {
  return joinNotes(byMode(NOTES_BY_MODE, context));
}
