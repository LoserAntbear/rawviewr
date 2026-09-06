export enum StoreEventType {
  Item = 'update::item',
  Order = 'update::order',
  Options = 'update::options',
  ViewMode = 'update::viewMode',
  Selection = 'update::selection',
}

export const itemEventType = (id: string): string => `${StoreEventType.Item}::${id}`;
