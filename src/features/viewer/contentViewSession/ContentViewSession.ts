import type { ContentViewMode, FileSource  } from '@features/viewer/types';

export class ContentViewSession {
  private readonly idIndex: ReadonlyMap<string, FileSource>;

  constructor(
    public readonly viewMode: ContentViewMode,
    public readonly sources: readonly FileSource[],
  ) {
    // Create an index once to fast traverse b/w sources
    this.idIndex = new Map(sources.map((source) => [source.id, source]));
  }

  public sourceFor(id: string): FileSource | undefined {
    return this.idIndex.get(id);
  }
}
