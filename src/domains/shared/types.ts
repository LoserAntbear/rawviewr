// Mostly used for reporters with vscode output bridge
export interface CommonReporter {
  show(): void;
  failed(reason: string): void;
  log(...lines: readonly string[]): void;
}
