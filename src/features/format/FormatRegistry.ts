import { FormatGroup, FormatGroupEntry, PixelFormat } from './types';

export class FormatRegistry {
  public get defaultFormat(): PixelFormat {
    return this.fallback;
  }

  private readonly formats = new Map<string, PixelFormat>();
  private readonly groups = new Map<FormatGroup, PixelFormat[]>();

  private readonly fallback: PixelFormat;

  constructor(
    presets: readonly PixelFormat[],
    fallbackFormatId: string,
  ) {
    for (const preset of presets) {
      this.register(preset);
    }

    const fallback = this.formats.get(fallbackFormatId);

    if (!fallback) {
      throw new Error(`Unknown fallback pixel format "${fallbackFormatId}".`);
    }

    this.fallback = fallback;
  }

  public get(id: string): PixelFormat {
    return this.formats.get(id) ?? this.fallback;
  }

  public has(id: string): boolean {
    return this.formats.has(id);
  }

  public list(): readonly PixelFormat[] {
    return [...this.formats.values()];
  }

  public ids(): readonly string[] {
    return [...this.formats.keys()];
  }

  public byGroup(): readonly FormatGroupEntry[] {
    return [...this.groups].map(([group, formats]) => ({ group, formats }));
  }

  public register(format: PixelFormat): void {
    if (this.formats.has(format.id)) {
      throw new Error(`Duplicate pixel format id "${format.id}".`);
    }

    this.formats.set(format.id, format);

    this.addFormatToGroup(format);
  }

  private addFormatToGroup(format: PixelFormat): void {
    const formatGroupBucket = this.groups.get(format.group);

    if (formatGroupBucket) {
      formatGroupBucket.push(format);
    } else {
      this.groups.set(format.group, [format]);
    }
  }
}
