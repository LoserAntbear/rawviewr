import { AppContext } from './types';
import { DisposableStore } from '@features/disposable/DisposableStore';

export class AppContextProvider extends DisposableStore {
  public static get context(): AppContext {
    if (!this._context) {
      throw new Error('AppContext has not been assigned.');
    }

    return this._context;
  }

  private static instance: AppContextProvider | null = null;
  private static _context: AppContext | null = null;

  private constructor(context?: AppContext) {
    super();

    try {
      if (context) {
        this.assign(context);
      }
    } catch (error) {
      console.error('Failed to assign AppContext:', error);
    }
  }

  public static create(context?: AppContext): AppContextProvider {
    if (this.instance) {
      throw new Error('AppContextProvider instance already exists.');
    }

    AppContextProvider.instance = new AppContextProvider(context);

    return AppContextProvider.instance;
  }

  public assign(context: AppContext): void {
    if (AppContextProvider._context) {
      throw new Error('AppContext already assigned; clear it before reassigning.');
    }

    AppContextProvider._context = context;
  }

  public clear(): void {
    AppContextProvider._context = null;
  }

  public dispose(): void {
    super.dispose();

    this.clear();
  }
}
