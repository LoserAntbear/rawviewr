export type InfoMessage =
  | { level: 'warn' | 'error'; message: string; }
  | { level: 'info'; message: string; items?: string[] };
export type InfoMessageLevel = InfoMessage['level'];
