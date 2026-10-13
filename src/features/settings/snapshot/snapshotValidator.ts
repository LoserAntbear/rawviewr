import type { DecodeOptions } from '@features/image/imageDecoder/types';

import { PRESERVED_OPTION_KEYS, type PreservedDecodeOptions } from './types';

/**
 * Comparing by value rather than by identity.
 * Since the copy can be passed around.
 */
function areSameOptions(current: DecodeOptions, next: PreservedDecodeOptions): boolean {
  return PRESERVED_OPTION_KEYS.every((key) => (
    key === 'format' ? current.format.id === next.format.id : Object.is(current[key], next[key])
  ));
}

export const SnapshotValidator = {
  areSameOptions,
};
