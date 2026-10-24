import { commands } from 'vscode';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VSCodeCommands } from '@definitions/vscode';

import { ContextKeyController } from './ContextKeyController';
import { ContextKeys, EXTENSION_CONTEXT_PREFIX } from './definitions';

/**
 * A context key is how a `when` clause in the manifest sees what only the webview knows. The
 * prefix is the whole contract: a key set under any other namespace is never read, and a
 * `when` naming an unset key reads as false — so the guard it was written to be silently
 * inverts.
 */
let controller: ContextKeyController;

beforeEach(() => {
  vi.mocked(commands.executeCommand).mockClear();
  controller = new ContextKeyController();
});

const lastSetCall = () => vi.mocked(commands.executeCommand).mock.calls.at(-1);

describe('ContextKeyController', () => {
  it('sets a key under the extension\'s own namespace', async () => {
    await controller.set(ContextKeys.FieldFocus, true);

    expect(lastSetCall()).toEqual([
      VSCodeCommands.SetContext,
      `${EXTENSION_CONTEXT_PREFIX}.${ContextKeys.FieldFocus}`,
      true,
    ]);
  });

  it('takes the prefix it was given, so a test can name its own', async () => {
    await new ContextKeyController('other').set(ContextKeys.FieldFocus, true);

    expect(lastSetCall()?.[1]).toBe(`other.${ContextKeys.FieldFocus}`);
  });

  it('puts a key down by setting it false, not by unsetting it', async () => {
    await controller.release(ContextKeys.FieldFocus);

    expect(lastSetCall()?.[2]).toBe(false);
  });

  /**
   * On teardown: a key left true goes on suppressing keybindings in views that never raised it.
   * Driven off the enum, so a key added later is released without anyone remembering to.
   */
  it('releases every key it knows about', async () => {
    await controller.releaseAll();

    const released = vi.mocked(commands.executeCommand).mock.calls.map(([, key]) => key);

    expect(released).toEqual(Object.values(ContextKeys).map((key) => `${EXTENSION_CONTEXT_PREFIX}.${key}`));
  });
});
