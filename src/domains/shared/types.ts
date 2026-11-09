export interface Reporter {
  log(message: string): void;
  show(message: string): void;
  failed(reason: string): void;
  unavailable(reason: string): void | Promise<void>;
}
