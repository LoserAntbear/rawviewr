import * as vscode from 'vscode';

import { VSCodeCommands } from '@definitions/vscode';

import { ContextKeys, EXTENSION_CONTEXT_PREFIX } from './definitions';

/**
 * Context keys – is a mechanism which allows the extension to communicate its state
 * via VSCode-backed context, by executing `SetContext` command for the given extension.
 *
 * This way different windows, for example, can be aware of the extension's state without directly querying it.
 */
export class ContextKeyController {
  private get keysList(): ContextKeys[] {
    return Object.values(this.KEYS);
  }

  public readonly KEYS = ContextKeys;

  constructor(
    private readonly extensionPrefix: string = EXTENSION_CONTEXT_PREFIX,
  ) {}

  public async set(key: ContextKeys, value: unknown): Promise<void> {
    const contextKey = `${this.extensionPrefix}.${key}`;

    await vscode.commands.executeCommand(VSCodeCommands.SetContext, contextKey, value);
  }

  public release(key: ContextKeys): Promise<void> {
    return this.set(key, false);
  }

  public releaseAll(): Promise<void[]> {
    return Promise.all(this.keysList.map(this.release.bind(this)));
  }
}
