import * as vscode from 'vscode';

import {
  ConfigChangeKind,
  VIEWER_CONFIG_KEYS,
  EXTENSION_CONFIGURATION_KEY,
} from './definitions';
import { CONFIG_VALIDATORS } from './validators';
import type {
  ConfigKey,
  ViewerConfigSchema,
  ViewerConfigKeySet,
  ConfigChangePayload,
 } from './types';
import { DisposableStore } from '@features/disposable/DisposableStore';
import { detectConfigKeyChangeKind } from './utils';

type ConfigChangeDetectedPayload = Record<ConfigChangeKind, ConfigKey[]>;

export class VSCodeWorkspaceConfigurationController extends DisposableStore {
  private get configuration(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(this.extensionConfigKey);
  }

  constructor(
    private readonly EMITTER: vscode.EventEmitter<ConfigChangePayload>,
    private readonly extensionConfigKey: string = EXTENSION_CONFIGURATION_KEY,
    private readonly configKeySet: ViewerConfigKeySet = VIEWER_CONFIG_KEYS,
  ) {
    super();

    this.disposables.push(this.EMITTER, this.subscribeToConfigurationChanges());
  }

  public read<K extends ConfigKey>(key: K): ViewerConfigSchema[K] {
    const configured = this.readConfigured(key);

    if (configured !== null) {
      return configured;
    }

    this.warnRejected(key);

    return this.readContributedDefault(key);
  }

  private readConfigured<K extends ConfigKey>(key: K): ViewerConfigSchema[K] | null {
    return this.validate(key, this.configuration.get(key));
  }

  /** The `default` declared in package.json, read at runtime so it is never duplicated here. */
  private readContributedDefault<K extends ConfigKey>(key: K): ViewerConfigSchema[K] {
    const declared = this.validate(key, this.configuration.inspect<unknown>(key)?.defaultValue);

    if (declared === null) {
      throw new Error(
        `${this.extensionConfigKey}.${key} has no valid value and no usable contributed default.`,
      );
    }

    return declared;
  }

  private validate<K extends ConfigKey>(key: K, raw: unknown): ViewerConfigSchema[K] | null {
    return CONFIG_VALIDATORS[key](raw);
  }

  /**
   * Only reachable when the user wrote something the schema rejects: an unset key
   * already resolves to the contributed default inside `get()`.
   */
  private warnRejected(key: ConfigKey): void {
    console.warn(
      `[rawImageViewer] ${this.extensionConfigKey}.${key} is invalid; falling back to the contributed default.`,
    );
  }

  private subscribeToConfigurationChanges(): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((event) => {
      const result: ConfigChangeDetectedPayload = {} as ConfigChangeDetectedPayload;

      this.configKeySet.all.reduce((acc, key) => {
        if (!event.affectsConfiguration(`${this.extensionConfigKey}.${key}`)) {
          return acc;
        }

        const changeEventKind = detectConfigKeyChangeKind(key, this.configKeySet);
        const changedKeys = acc[changeEventKind] ?? [];

        changedKeys.push(key);

        acc[changeEventKind] = changedKeys;

        return acc;
      }, result);

      this.fireChangeEvents(result);
    });
  }

  private fireChangeEvents(payload: ConfigChangeDetectedPayload): void {
    for (const [kind, keys] of Object.entries(payload)) {
      if (keys.length === 0) {
        continue;
      }

      this.EMITTER.fire({ kind: kind as ConfigChangeKind, keys });
    }
  }
}
