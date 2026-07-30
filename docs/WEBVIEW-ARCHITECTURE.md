# Webview architecture — component redesign

Status: proposal, not yet implemented.

Covers the webview UI only (`src/webview/main.ts` + the HTML shell in `src/viewer.ts`).
The extension-host side was cleaned up separately: focus tracking now lives in
`src/viewerRegistry.ts` and the manual `rawImageViewer.activeViewer` context key is gone.

## The actual problem

Not "IDs are stored in a map". The problem is that **one logical control is declared in
six places**, and the compiler links none of them.

Take `width`. To add or change it you edit:

| # | Site | File |
|---|------|------|
| 1 | markup | `viewer.ts:298` (inside a template literal) |
| 2 | element ref | `main.ts:67` (`ui` map) |
| 3 | read → options | `main.ts:180` (`readOptionsFromUi`) |
| 4 | options → write | `main.ts:195` (`applyOptionsToUi`) |
| 5 | enable/disable rules | `main.ts:220` (`updateControlAvailability`) |
| 6 | event wiring | `main.ts:582`, `:596` (two grouped listener loops) |

Sites 3, 4 and 5 are three parallel switchboards over the same eleven controls. Site 6 is
two more lists of the same controls, grouped by which DOM event they need. Miss one and
you get a control that renders but never commits, or commits but never restores, or
restores but never greys out.

Secondary problems that follow from the same root:

- **The host builds DOM it has no business building.** `formatOptionsHtml()`
  (`viewer.ts:242`) serialises `<optgroup>` markup in the extension host — but
  `common/formats.ts` is *already bundled into the webview* (`main.ts:11` imports
  `getFormat` from it). The webview has the data and re-receives it as a string.
  `escapeHtml()` (`viewer.ts:255`) exists only to service this.
- **The module is the instance.** Eleven module-level mutable bindings (`main.ts:40-50`
  plus `renderHandle` at `:249`) holding three different lifetimes: document state
  (`entries`, `order`, `selectedId`, `mode`), view state (`zoom`, `fitToWindow`,
  `frameTiles`, `current`) and settings (`options`, `settings`). Works only because each
  webview is its own JS realm — nothing in the design says so, and nothing is testable
  without a DOM.
- **Synthetic clicks as a message bus.** The keyboard handler (`main.ts:671-700`) calls
  `ui.framePrev.click()`, `ui.zoomIn.click()` etc. to reach behaviour it can't otherwise
  address.

## What stays for now

Worth stating, so the refactor doesn't sprawl:

- **`src/common/protocol.ts` is unchanged.** The host↔webview boundary is already clean
  and typed. This work does not touch it.
- **`src/common/decode.ts` and `formats.ts` are unchanged.** Will be reorganised later, but the webview redesign does not need to touch them.
- **Canvas rendering stays imperative.** `renderSingle` / `renderFrameTiles` /
  `renderGallery` / `buildTile` / `paint` / `handleProbe` do pixel work. No component
  model improves them; they move into a component but their bodies survive intact.
- **Fail-loud on missing DOM.** `el()` throwing (`main.ts:56-62`) is the one good instinct
  in the current code. Components keep it — a component that cannot find its parts throws
  in `connectedCallback`.

## Design

### Light-DOM custom elements

No shadow roots. `media/viewer.css` keeps working as a single stylesheet, the existing
`style-src ${webview.cspSource}` CSP is already satisfied, and `--vscode-*` theme
variables apply directly. Style isolation is the only thing shadow DOM would buy and
there is no foreign CSS here to isolate from.

Components are registered via `customElements.define()` and own their subtree, lifecycle
and events.

### One descriptor per control

The six-site problem is solved by declaring each control once and deriving everything
else. Sketch:

```ts
// src/webview/controls/descriptors.ts
export const CONTROLS = [
  {
    id: 'width',
    kind: 'number',
    bind: 'width',                                   // key in DecodeOptions
    read: (el) => positiveInt(el.value),
    write: (el, o) => { el.value = o.width ? String(o.width) : ''; },
    disabled: (o) => o.headerPreset !== 'none',
    placeholder: (o) => (o.headerPreset !== 'none' ? 'header' : 'auto'),
    events: ['change', 'input'],
  },
  // ...
] as const satisfies readonly ControlDescriptor[];
```

`<option-field>` reads its descriptor, renders its own markup, wires its own listeners,
and implements `read()` / `write()` / `refresh()`. `readOptionsFromUi`,
`applyOptionsToUi`, `updateControlAvailability` and both listener loops collapse into
iteration over the toolbar's children. Adding a control becomes one array entry.

This is the load-bearing change. The custom elements are the delivery mechanism for it.

### File separation

esbuild is already the bundler, so real separation costs one config line:

```js
// esbuild.mjs — webview config
loader: { '.html': 'text', '.css': 'text' },
```

giving `toolbar.html` / `toolbar.css` / `toolbar.ts` triplets with genuine syntax
highlighting, formatting and linting. Component CSS is concatenated into `viewer.css`'s
role or imported per component and appended once at startup (light DOM, so it is all one
cascade — keep selectors namespaced by tag name, e.g. `raw-toolbar .group`).

### Proposed layout

```
src/webview/
  main.ts                  # ~40 lines: register elements, wire host messages, post ready
  vscodeApi.ts             # acquireVsCodeApi() exactly once, typed post()
  state/
    store.ts               # entries/order/selectedId + change notification
    viewState.ts           # zoom, fitToWindow, frameTiles
  controls/
    descriptors.ts         # the CONTROLS array
    OptionField.ts         # <option-field>
  components/
    RawApp.ts   / .html / .css     # <raw-viewer-app> root, owns message routing
    RawToolbar.ts / .html / .css   # <raw-toolbar>, builds fields from descriptors
    FormatSelect.ts                # <format-select>, builds optgroups from formats.ts
    RawStage.ts   / .html / .css   # <raw-stage>, owns canvas/grid/empty + probe
    RawStatus.ts  / .html / .css   # <raw-status>
```

Host shell shrinks to roughly:

```html
<link href="${style}" rel="stylesheet">
<raw-viewer-app></raw-viewer-app>
<script nonce="${csp}" src="${script}"></script>
```

`renderHtml` drops from ~130 lines of markup to ~15 lines of genuinely dynamic shell
(nonce, CSP, `asWebviewUri`). `formatOptionsHtml` and `escapeHtml` are deleted.

## Migration sequence

Each step builds and runs on its own; none is a big-bang.

1. **Shell + build.** Add the esbuild loaders. Move markup out of `viewer.ts` into
   `webview/components/*.html`.
   Delete `formatOptionsHtml` / `escapeHtml`; `<format-select>` builds its own options
   from `formatsByGroup()`.
   Move out control and reference keeping from main.
2. **Descriptors.** Introduce `CONTROLS` and `<option-field>`. Collapse the three
   switchboards and both listener loops. This is where the six-site problem dies.
3. **Stage + status components.** Move canvas/grid/probe/status into `<raw-stage>` and
   `<raw-status>`, bodies unchanged.
4. **State off the module.** `entries`/`order`/`selectedId` into a store; view state into
   `viewState`. Replace `ui.framePrev.click()` in the keyboard handler with dispatched
   commands.

Steps 1–2 deliver most of the value. Steps 3–4 are what make it testable.

## Risks and gotchas

- **`acquireVsCodeApi()` may only be called once per webview.** Must be a single module
  (`vscodeApi.ts`) that everything imports. Splitting into components makes it easy to
  call it twice by accident — this will throw at runtime, not build time.
  Remediation: DI acquired API into components, or pass a `post()` function down.

- **Registration timing.** `post({ type: 'ready' })` fires at the end of `main.ts:797`.
  It must still fire only after all `customElements.define()` calls, or the host's `init`
  message can arrive before components can handle it.
- **`retainContextWhenHidden: true`** is set on all panels, so webview state persists
  across tab switches. Component `disconnectedCallback` should not assume teardown means
  the viewer is gone.
- **Light DOM means one cascade.** Component CSS is not isolated; namespace selectors by
  tag name or the components will style each other.
- **No test harness exists yet.** Step 4's value is testability, but there is currently no
  runner. Worth adding one (node + happy-dom or `@vscode/test-electron`) before or
  alongside it, otherwise "testable" stays theoretical.

## Open items

- No decision on whether `getState`/`setState` (declared in the `acquireVsCodeApi` type
  but unused) should back view-state persistence now that `retainContextWhenHidden`
  already covers the common case.
