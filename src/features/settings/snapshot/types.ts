import type { DecodeOptions } from '@features/image/imageDecoder/types';

/**
 * A snapshot of currently selected options.
 * So that the current state of the toolbar can be preserved b/w different views.
 *
 * Only appliocable when the specific toggle is ON.
 */
export type ToolbarOptionsSnapshot = {
  readonly preserved: boolean;
  readonly options: DecodeOptions;
};
