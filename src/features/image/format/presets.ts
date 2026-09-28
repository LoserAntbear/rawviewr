import { buildFormat } from './formatBuilders/builders';
import { FORMAT_DEFINITIONS } from './definitions';
import { PixelFormat } from './types';

export class PixelFormatPresets {
  public static readonly PRESETS: readonly PixelFormat[] = FORMAT_DEFINITIONS.map(buildFormat);
  public static readonly getPreset = (id: string): PixelFormat => {
    const preset = this.PRESETS.find((format) => format.id === id);

    if (!preset) {
      throw new Error(`Unknown pixel format "${id}".`);
    }

    return preset;
  }
}
