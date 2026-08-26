import { BufferItem } from './BufferItem';

/**
 * Intentionally non-mutable array to store the order of items
 * To prevent items from being re-ordered in view when they are updated
 */
export class BufferItemRegistry {
  public readonly entries: BufferItem[] = [];

  public add(item: BufferItem[]): void;
  public add(item: BufferItem): void;
  public add(item: BufferItem | BufferItem[]): void {
    const items = Array.isArray(item) ? item : [item];

    for (const i of items) {
      if (!this.has(i.id)) {
        this.entries.push(i);
      }
    }
  }

  public get(id: string): BufferItem | undefined {
    return this.entries.find(entry => entry.id === id);
  }

  public has(id: string): boolean {
    return this.findIndex(id) !== -1;
  }

  public remove(id: string): void {
    const index = this.findIndex(id);

    if (index !== -1) {
      this.entries.splice(index, 1);
    }
  }

  private findIndex(id: string): number {
    return this.entries.findIndex(entry => entry.id === id);
  }
}
