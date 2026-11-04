import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { CommandNames } from '@definitions/commands';
import { IntentKind } from '@definitions/intent';
import { ViewType } from '@definitions/viewTypes';
import { VSCodeWebviewContextActionTarget } from '@definitions/vscode';
import { ContextKeys, EXTENSION_CONTEXT_PREFIX } from '@EXTENSION/features/vscode/contextKeys/definitions';

import { parseRevealItem, parseZoomIn, parseZoomOut, parseZoomReset } from './parsers';
import { COMMANDS } from './table';

/**
 * The manifest and this table are one contract held together by a comment, and nothing else:
 * a command contributed but not registered throws "command not found" at the user, and one
 * registered but not contributed is unreachable. The compiler cannot see either, so it is
 * checked here — including the `when` guard, which is the only thing stopping a bare zoom
 * chord from firing while a toolbar field has focus.
 */

type Manifest = {
  contributes: {
    commands: readonly { command: string; title: string }[];
    keybindings: readonly { key: string; command: string; when: string }[];
    menus: {
      commandPalette: readonly { command: string; when: string }[];
      'webview/context': readonly { command: string; when: string }[];
    };
  };
};

const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as Manifest;
const { commands, keybindings, menus } = manifest.contributes;

const contributed = commands.map(({ command }) => command);
const registered = COMMANDS.map(({ name }) => String(name));
const ZOOM_COMMANDS: readonly CommandNames[] = [
  CommandNames.zoomIn,
  CommandNames.zoomOut,
  CommandNames.zoomReset,
];

describe('the command table against the manifest', () => {
  it.each(Object.values(CommandNames))('%s is contributed', (name) => {
    expect(contributed).toContain(name);
  });

  it('registers a handler for every contributed command, and contributes every handler', () => {
    expect([...registered].sort()).toEqual([...contributed].sort());
  });

  it('parses each invocation once, so no command shares another one\'s intent', () => {
    expect(new Set(registered).size).toBe(registered.length);
  });
});

describe('the zoom keybindings', () => {
  const zoomKeybindings = keybindings.filter(({ command }) => ZOOM_COMMANDS.includes(command as CommandNames));

  it('binds every zoom command to at least one chord', () => {
    expect(new Set(zoomKeybindings.map(({ command }) => command)))
      .toEqual(new Set(ZOOM_COMMANDS.map(String)));
  });

  it.each(keybindings)('$key is scoped to our views and stands down for a focused field', ({ when }) => {
    // VS Code forwards the keystroke whatever has focus inside the webview, so without the
    // second clause a bare `0` would reset the zoom *and* type a zero into Width.
    expect(when).toContain('!rawImageViewer.fieldFocus');
    expect(when).toContain('activeCustomEditorId =~ /^rawImageViewer\\.editor/');
    expect(when).toContain("activeWebviewPanelId == 'rawImageViewer.gallery'");
  });

  /**
   * The guard above checks the manifest names a key; this checks the extension sets the one it
   * names. They drifted once — the code set `rawviewr.fieldFocus` while the manifest guarded
   * `rawImageViewer.fieldFocus`, so the guard was permanently true and a bare `0` reset the
   * zoom while someone was typing a zero into Width.
   */
  it('guards on the key the extension actually sets', () => {
    const key = `${EXTENSION_CONTEXT_PREFIX}.${ContextKeys.FieldFocus}`;

    expect(keybindings.every(({ when }) => when.includes(`!${key}`))).toBe(true);
  });

  /** The palette takes focus off the webview, so the field guard would hide the entries. */
  it.each(ZOOM_COMMANDS)('%s is offered in the palette without the field guard', (command) => {
    const entry = menus.commandPalette.find((row) => row.command === command);

    expect(entry?.when).not.toContain('fieldFocus');
    expect(entry?.when).toContain('activeCustomEditorId');
  });
});

/**
 * A webview context menu is two halves that cannot see each other: the `when` clause here, and
 * the `data-vscode-context` the gallery writes at the moment of the click. Neither name is
 * typed, and a mismatch in either is silent — the right-click simply offers nothing.
 */
describe('the gallery context menu', () => {
  const entry = menus['webview/context'].find(({ command }) => command === CommandNames.revealItem);

  it('offers the reveal on a right-clicked item', () => {
    expect(entry).toBeDefined();
  });

  it('is scoped to the gallery, which is the only view with items to name', () => {
    expect(entry?.when).toContain(`webviewId == '${ViewType.Gallery}'`);
  });

  it('tests for the section the gallery actually writes', () => {
    expect(entry?.when).toContain(`webviewSection == '${VSCodeWebviewContextActionTarget.GalleryItem}'`);
  });

  /** It needs a right-clicked item to mean anything, and the palette never has one. */
  it('stays out of the palette, where it would resolve to nothing', () => {
    const palette = menus.commandPalette.find(({ command }) => command === CommandNames.revealItem);

    expect(palette?.when).toBe('false');
  });
});

describe('the reveal parser', () => {
  it('takes the id out of the context the menu hands over', () => {
    expect(parseRevealItem({ webviewSection: 'galleryItem', itemId: 'file:///a.raw' }))
      .toEqual({ kind: IntentKind.viewRevealItem, itemId: 'file:///a.raw' });
  });

  /** A refused parse is reported and dropped, so none of these reach a resolver. */
  it.each([
    ['nothing at all', undefined],
    ['a bare string', 'file:///a.raw'],
    ['a context naming no item', { webviewSection: 'galleryItem' }],
    ['an id that is not a string', { itemId: 42 }],
    ['an empty id', { itemId: '' }],
  ])('refuses %s', (_case, argument) => {
    expect(parseRevealItem(argument)).toBeNull();
  });
});

describe('the zoom parsers', () => {
  it.each([
    [parseZoomIn, 'in'],
    [parseZoomOut, 'out'],
    [parseZoomReset, 'reset'],
  ] as const)('turns its own invocation into a %# zoom intent', (parse, direction) => {
    // A chord carries no arguments: whatever VS Code passes, the direction is the command.
    expect(parse('noise', 42)).toEqual({ kind: IntentKind.viewZoom, direction });
  });
});
