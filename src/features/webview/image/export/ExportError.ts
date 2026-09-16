import type { WebviewMessage } from '../../webviewHost/types';
import type { StatusLevel } from './types';

export class ExportError {
  public readonly message: WebviewMessage;

  constructor(
    level: StatusLevel,
    message: string,
  ) {
    this.message = { type: 'app:status', level, message };
  }
}
