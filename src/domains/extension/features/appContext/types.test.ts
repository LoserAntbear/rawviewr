import { describe, expect, it } from 'vitest';

import type { ConfigReader } from '@SHARED/features/settings/configuration/types';

import type { AppContext } from './types';

/**
 * The context is a global anything on the host can reach, and the configuration controller it
 * carries is a `DisposableStore`. Typed as the concrete class, every one of those callers could
 * dispose the only reader the host has — and nothing would say so until settings stopped
 * answering at runtime. `ConfigReader` is the whole fix, so it is worth a probe: these fail
 * under `tsc`, which is the only place they can fail.
 */
describe('what the app context hands out', () => {
  it('reads settings', () => {
    const reader: ConfigReader = {
      read: () => 128 as never,
      onDidChange: () => ({ dispose: () => undefined }),
    };
    const context: AppContext = { workspaceConfig: reader };

    expect(context.workspaceConfig.read('maxFileSizeMB')).toBe(128);
  });

  it('and offers no way to dispose of them', () => {
    const context = { workspaceConfig: {} as ConfigReader } satisfies AppContext;

    // @ts-expect-error -- not on a reader, and no amount of running the code would say so.
    expect(context.workspaceConfig.dispose).toBeUndefined();
  });
});
