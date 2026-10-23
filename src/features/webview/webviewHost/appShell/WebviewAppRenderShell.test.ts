import { Uri } from 'vscode';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WebviewAppRenderShell } from './WebviewAppRenderShell';

/**
 * What a webview is allowed to do, and the one script it is allowed to run. The nonce is the
 * load-bearing part: the template's content-security policy names it, so a script that does not
 * carry it never runs.
 */
let webview: { options: unknown; html: string; cspSource: string; asWebviewUri: ReturnType<typeof vi.fn> };

beforeEach(() => {
  webview = {
    options: {},
    html: '',
    cspSource: 'vscode-resource:',
    asWebviewUri: vi.fn(() => ({ toString: () => 'https://host/main.js' })),
  };
});

const render = () => new WebviewAppRenderShell(Uri.file('/ext') as never).render(webview as never);

describe('WebviewAppRenderShell', () => {
  it('turns scripts on and confines local reads to the extension', () => {
    render();

    expect(webview.options).toEqual({
      enableScripts: true,
      localResourceRoots: [expect.objectContaining({ path: '/ext' })],
    });
  });

  it('writes the bundle in through the webview\'s own uri scheme', () => {
    render();

    expect(webview.html).toContain('https://host/main.js');
  });

  it('names the webview\'s csp source, which only it can know', () => {
    render();

    expect(webview.html).toContain('vscode-resource:');
  });

  it('leaves no placeholder behind', () => {
    render();

    expect(webview.html).not.toMatch(/\{\{\s*\w+\s*\}\}/);
  });

  /** Two views sharing a nonce would let either one's script run in the other. */
  it('mints a fresh nonce for every render', () => {
    render();

    const first = webview.html;

    webview.html = '';
    render();

    expect(webview.html).not.toBe(first);
  });
});
