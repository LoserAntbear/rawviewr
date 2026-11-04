import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { CaptureFinishSignal, CaptureOutputType } from '@definitions/capture';
import {
  EXTENSION_CONFIGURATION_KEY,
  VIEWER_CONFIG_KEYS,
} from '@SHARED/features/settings/configuration/definitions';

/**
 * Capture names a program and runs it, so what may set that name is the whole of the security
 * model — and none of it is anything the compiler can see. `scope` is a string in a JSON file:
 * drop it and the setting silently becomes window-scoped, which a `.vscode/settings.json` in a
 * cloned repo can write. The extension declaring itself unsupported in Restricted Mode is the
 * other half, and is equally invisible.
 *
 * The enum checks are a different kind of rot: the contributed `enum` fills the settings
 * dropdown while the TypeScript enum is what the validator accepts, and nothing ties them
 * together. A word in one and not the other means the dropdown offers a value that is refused
 * on read, and the user gets the default with no complaint.
 */

type ConfigProperty = {
  scope?: string;
  default?: unknown;
  enum?: readonly string[];
};

type Manifest = {
  capabilities?: { untrustedWorkspaces?: { supported?: boolean } };
  contributes: { configuration: { properties: Record<string, ConfigProperty> } };
};

const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as Manifest;
const { properties } = manifest.contributes.configuration;

const CAPTURE_PREFIX = `${EXTENSION_CONFIGURATION_KEY}.capture.`;
const captureKeys = Object.keys(properties).filter((key) => key.startsWith(CAPTURE_PREFIX));

/**
 * Named one by one rather than swept, so renaming the group or a key fails here instead of
 * leaving a filter that matches nothing and passes. These three are the ones that have to be
 * machine-scoped: the program, its arguments, and where its output is copied.
 */
const EXECUTION_KEYS = [
  `${CAPTURE_PREFIX}command`,
  `${CAPTURE_PREFIX}args`,
  `${CAPTURE_PREFIX}saveFolder`,
];

const ENUM_SETTINGS: readonly [key: string, members: readonly string[]][] = [
  [`${CAPTURE_PREFIX}outputType`, Object.values(CaptureOutputType)],
  [`${CAPTURE_PREFIX}stopWith`, Object.values(CaptureFinishSignal)],
];

describe('a repository cannot name the program we run', () => {
  it.each(EXECUTION_KEYS)('%s is machine-scoped', (key) => {
    expect(captureKeys).toContain(key);
    expect(properties[key].scope).toBe('machine');
  });

  /**
   * `machine` and `application` are the only scopes a workspace or folder cannot write; an
   * omitted scope is `window`, which it can. All seven carry it so that this reads as one rule
   * rather than a list of exceptions, and so a new capture setting is covered by default.
   */
  it('and so is every other capture setting', () => {
    expect(captureKeys.filter((key) => properties[key].scope !== 'machine')).toEqual([]);
  });

  /**
   * Belt to that brace: in Restricted Mode the extension does not run at all, so there is
   * nothing to read a setting from. Absent `capabilities` means the same thing, which is why
   * this is stated — to be here when someone weighs relaxing it to `limited`.
   */
  it('and in a workspace you have not trusted, nothing of ours runs', () => {
    expect(manifest.capabilities?.untrustedWorkspaces?.supported).toBe(false);
  });
});

describe('the capture settings against the rest of the configuration', () => {
  /**
   * They are read once per run, nothing re-renders on them, and `detectConfigKeyChangeKind`
   * only ever sees a key already in `all`. The `satisfies` on `VIEWER_CONFIG_KEYS` requires
   * every listed key to be a `ConfigKey`, not the reverse, so the omission is deliberate and
   * invisible without this.
   */
  it('are not among the keys an open viewer reacts to', () => {
    expect(VIEWER_CONFIG_KEYS.all.filter((key) => key.startsWith('capture.'))).toEqual([]);
  });

  it.each(ENUM_SETTINGS)('%s offers the words its validator accepts, and defaults to one', (key, members) => {
    const { enum: offered, default: fallback } = properties[key];

    expect([...(offered ?? [])].sort()).toEqual([...members].sort());
    expect(members).toContain(fallback);
  });
});
