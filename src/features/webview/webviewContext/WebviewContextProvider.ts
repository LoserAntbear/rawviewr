import { WebviewContext } from './types';

export class WebviewContextProvider {
  public static get context(): WebviewContext {
    if (!this._context) {
      throw new Error('WebviewContext has not been assigned.');
    }

    return this._context;
  }

  private static instance: WebviewContextProvider | null = null;
  private static _context: WebviewContext | null = null;

  private constructor(context?: WebviewContext) {
    try {
      if (context) {
        this.assign(context);
      }
    } catch (error) {
      console.error('Failed to assign WebviewContext:', error);
    }
  }

  public static create(context?: WebviewContext): WebviewContextProvider {
    if (this.instance) {
      throw new Error('WebviewContextProvider instance already exists.');
    }

    WebviewContextProvider.instance = new WebviewContextProvider(context);

    return WebviewContextProvider.instance;
  }

  public assign(context: WebviewContext): void {
    if (WebviewContextProvider._context) {
      throw new Error('WebviewContext already assigned; clear it before reassigning.');
    }

    WebviewContextProvider._context = context;
  }

  public clear(): void {
    WebviewContextProvider._context = null;
  }
}
