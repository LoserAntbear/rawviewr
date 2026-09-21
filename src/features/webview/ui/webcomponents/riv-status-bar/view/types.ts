export type StatusLevel = 'info' | 'warn' | 'error';
export type StatusBarEntry = {
  readonly text: string;
  readonly level: StatusLevel;
};
export type StatusBarRenderEntries = Readonly<Record<string, StatusBarEntry | null>>;
