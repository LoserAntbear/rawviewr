import { buildFormat } from './formatBuilders/builders';
import { FORMAT_DEFINITIONS } from './definitions';
import { PixelFormat } from './types';

export const FORMAT_PRESETS: readonly PixelFormat[] = FORMAT_DEFINITIONS.map(buildFormat);
