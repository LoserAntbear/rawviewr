import { BufferItem } from './BufferItem';

export class BufferItemRegistry {
  public get entries(): readonly BufferItem[] {
    return [...this.items.values()];
  }

  public get ids(): readonly string[] {
    return [...this.items.keys()];
  }

  public get size(): number {
    return this.items.size;
  }

  private readonly items = new Map<string, BufferItem>();

  public upsert(item: BufferItem): void;
  public upsert(items: BufferItem[]): void;
  public upsert(item: BufferItem | BufferItem[]): void {
    const items = Array.isArray(item) ? item : [item];

    for (const entry of items) {
      this.items.set(entry.id, entry);
    }
  }

  public get(id: string): BufferItem | undefined {
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
