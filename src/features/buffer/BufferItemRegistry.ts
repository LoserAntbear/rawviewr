import type { BufferItemData } from './types';

export class BufferItemRegistry {
  public get entries(): readonly BufferItemData[] {
    return [...this.items.values()];
  }

  public get ids(): readonly string[] {
    return [...this.items.keys()];
  }

  public get size(): number {
    return this.items.size;
  }

  private readonly items = new Map<string, BufferItemData>();

  public upsert(item: BufferItemData): void;
  public upsert(items: BufferItemData[]): void;
  public upsert(item: BufferItemData | BufferItemData[]): void {
    const items = Array.isArray(item) ? item : [item];

    for (const entry of items) {
      this.items.set(entry.id, entry);
    }
  }

  public get(id: string): BufferItemData | undefined {
    return this.items.get(id);
  }

  public has(id: string): boolean {
    return this.items.has(id);
  }

  public remove(id: string): boolean {
    return this.items.delete(id);
  }

  public clear(): void {
    this.items.clear();
  }
}
