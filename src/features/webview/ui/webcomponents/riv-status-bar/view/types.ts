export type StatusLevel = 'info' | 'warn' | 'error';
export type StatusBarEntry = {
  readonly text: string;
  readonly level: StatusLevel;
  readonly loading?: boolean;
};
export type StatusBarRenderEntries = Readonly<Record<string, StatusBarEntry | null>>;
