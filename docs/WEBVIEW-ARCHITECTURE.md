# Webview architecture — component redesign

Status: **host-side decomposition largely done; webview components decode end to end; `tsc` red in the unported reference and two parked sketches.**

Covers the webview UI (`src/features/webview/main.ts`) and the host-side classes that feed
it. Focus tracking is done and lives in `ViewerRegistry`; the manual
`rawImageViewer.activeViewer` context key is gone, replaced by the built-in
`activeCustomEditorId` / `activeWebviewPanelId`.

## Where this stands

| Area | State |
| --- | --- |
| Focus tracking / `ViewerRegistry` | **done** — reads `panel.active` on demand, no mirrored global |
| Intent layer (`IntentDispatcher`, resolvers, command table) | **done** — exhaustive `IntentResolverMap` |
| Configuration controller | **done** — typed schema, manifest-derived keys, per-kind events |
| Disposal (`DisposableRegistry` + self-registering `DisposableStore`) | **done** |
| ESLint + `disposables` rule | **done** — scoped to raw `disposables: X[] = []` arrays, so holding a `WebviewDisposableStore` stays legal |
| ESLint + promise rules | **done** — type-aware `no-floating-promises` (`void` and `Thenable`s included) and `no-misused-promises`; see **Async discipline** in `PROJECTSTATE.md` |
| `Viewer` decomposition | **in flight** — old class deleted, `WebViewHost` half-populated |
| Webview components (steps 1–4) | **in flight** — five components exist and the decode path is complete: store slices -> `DecodeSlice.decode` -> `riv-image`. The toolbar drives all eleven decode options. Probe, export, zoom and frame tiles are still unported |
| Store (registry, slices, selectors, reactions) | **done** — `ReactiveStore` holds no domain methods |
| Decode pipeline | **done** — geometry on the item, `VisibleImageDecoder` decodes what is on screen into `ImagesSlice`, which owns every `ImageBitmap`; see **The decode chain** in `PROJECTSTATE.md` |
| Component composition (`RIVView`, `RIVViewState`) | **done** — element / view / state split, proven on `riv-image` and `riv-toolbar` |
| Test harness | **done** — vitest + happy-dom, split into webview and host projects; see **Testing** in `PROJECTSTATE.md` |

The build does not currently compile — see [Outstanding work](#outstanding-work). Nothing
below is blocked on the webview redesign; the two tracks are independent.

## The actual problem

Not "IDs are stored in a map". The problem is that **one logical control is declared in
six places**, and the compiler links none of them.

Take `width`. To add or change it you edit:

| # | Site | Location |
| --- | ------ | ---------- |
| 1 | markup | template literal, formerly `renderHtml` |
| 2 | element ref | `webview/main.ts:65` (`ui` map) |
| 3 | read → options | `webview/main.ts:179` (`readOptionsFromUi`) |
| 4 | options → write | `webview/main.ts:194` (`applyOptionsToUi`) |
| 5 | enable/disable rules | `webview/main.ts:219` (`updateControlAvailability`) |
| 6 | event wiring | `webview/main.ts:581`, `:595` (two grouped listener loops) |

Sites 3, 4 and 5 are three parallel switchboards over the same eleven controls. Site 6 is
two more lists of the same controls, grouped by which DOM event they need. Miss one and
you get a control that renders but never commits, or commits but never restores, or
restores but never greys out.

Secondary problems that follow from the same root:

- **The host builds DOM it has no business building.** `formatOptionsHtml()`
  (`viewer.ts:223`) serialises `<optgroup>` markup in the extension host — but the format
  registry is *already bundled into the webview*. The webview has the data and re-receives
  it as a string. `escapeHtml()` (`viewer.ts:236`) exists only to service this.
- **The module is the instance.** Ten module-level mutable bindings
  (`webview/main.ts:39-49` plus `renderHandle` at `:248`) holding three different
  lifetimes: document state (`entries`, `order`, `selectedId`, `mode`), view state
  (`zoom`, `fitToWindow`, `frameTiles`, `current`) and settings (`options`, `settings`).
  Works only because each webview is its own JS realm — nothing in the design says so, and
  nothing is testable without a DOM.
- **Synthetic clicks as a message bus.** The keyboard handler (`webview/main.ts:670`) calls
  `ui.framePrev.click()`, `ui.zoomIn.click()` etc. to reach behaviour it can't otherwise
  address.

## The process boundary

**The single rule that governs the whole layout**, because the type system will not
enforce it:

| | Runs in | Can import |
| --- | --- | --- |
| `features/viewer/*`, `features/extension/*` | extension host (Node) | `vscode`, `node:*` |
| webview UI (`main.ts`, components) | webview sandbox (browser) | neither |

They share **only serialised messages** over `postMessage`. No shared objects, no shared
module instances.

Consequences:

- Nothing from `main.ts` can move into the host-side `Viewer`/`WebviewHost`, and nothing
  from those can move into a component.
- esbuild builds two independent entry points, so a wrong-side import **fails at runtime
  in the sandbox**, not at build time. There is no compiler error to catch it.
- Therefore: **the two sides must not share a directory.** Browser-side code belongs under
  a dedicated root (`src/webview/`), host-side under `src/features/viewer/`. The current
  `src/features/webview/` holding the browser bundle next to host-side types invites
  exactly the import that fails silently.

When this doc says "the app root owns message routing", it means a *webview-side*
`<raw-app>` element — never the host-side class.

## What stays for now

Worth stating, so the refactor doesn't sprawl:

- **The host↔webview message protocol is unchanged.** That boundary is already clean and
  typed. This work does not touch it.
- **The decode/format modules are unchanged.** Will be reorganised later, but the webview
  redesign does not need to touch them.
- **Canvas rendering stays imperative.** `renderSingle` / `renderFrameTiles` /
  `renderGallery` / `buildTile` / `paint` / `handleProbe` do pixel work. No component
  model improves them; they move into a component but their bodies survive intact.
- **Fail-loud on missing DOM.** `el()` throwing (`webview/main.ts:55`) is the one good
  instinct in the current code. Components keep it — a component that cannot find its
  parts throws in `connectedCallback`.

## Design — webview side

### Light-DOM custom elements

No shadow roots. One stylesheet keeps working, the existing
`style-src ${webview.cspSource}` CSP is already satisfied, and `--vscode-*` theme
variables apply directly. Style isolation is the only thing shadow DOM would buy and
there is no foreign CSS here to isolate from.

Light DOM means one cascade: namespace component selectors by tag name (`raw-toolbar
.group`) or components will style each other.

### Generic by kind, never by meaning

Primitives are `<riv-select>`, `<riv-toggle>`, `<riv-number>`, `<riv-range>`,
`<riv-button>`. A primitive knows how to render its kind, read its value and emit a
change event. It does **not** know what `width` means, and imports nothing from the
decode or format modules.

Contract: **value in, event out.** No primitive reads or writes shared state.

### Registration and init order

Prefer one explicit `defineComponents()` barrel over side-effect registration in each
module. The reason is the ready handshake:

```
defineComponents()      // every customElements.define() has run
  → <raw-app> upgrades  // connectedCallback
    → post({ type: 'ready' })
      → host replies with 'init'
```

`ready` must not fire before every `define()` has run, or `init` lands on an element that
hasn't upgraded and the payload is silently dropped — empty toolbar, no error. A barrel
makes that ordering explicit; scattered side-effect imports make it depend on import
order.

### One descriptor per control — and only for the controls it fits

The six-site problem is solved by declaring each field once and deriving everything else:

```ts
// descriptor: pure data + pure functions of (element, options)
{
  id: 'width',
  kind: 'number',
  read:     (el)    => positiveInt(el.value),
  write:    (el, o) => { el.value = o.width ? String(o.width) : ''; },
  disabled: (o)     => o.headerPreset !== 'none',
  events:   ['change', 'input'],
}
```

One generic applier turns binding into behaviour — **no per-control handler functions**:

```ts
field.addEventListener('riv-change', () => commit());
```

If a descriptor carries a closure that does the work, the switchboard has moved into the
array rather than disappeared. Keep descriptors as *descriptors*; the moment they become
"controllers" they accrete behaviour and become the god object this refactor exists to
kill.

**The descriptor array covers 13 of the 35 element refs.** The rest need different
treatment, and forcing them into the array is the main way this design goes wrong:

| Kind | Count | Handling |
| --- | --- | --- |
| Option-bound fields — `format`, `width`, `height`, `offset`, `stride`, `endian`, `bitorder`, `alpha`, `unpremul`, `flipy`, `header` | 11 | descriptors → decode options |
| Settings-bound — `background`, `tileSize` | 2 | descriptors → viewer settings |
| Commands — `guess`, `zoom-out/in/fit/reset`, `frame-prev/next`, `export-png` | 8 | **not** descriptors — emit commands |
| View-state toggle — `frame-tiles` | 1 | view state |
| Display + containers — `zoom-level`, `frame-label`, `status-*`, `*-group`, `stage`, `surface`, `canvas`, `grid`, `empty` | 13 | owned by `<raw-stage>` / `<raw-status>` |

`guess` is the case that proves the rule: it writes into *two other controls* and then
clears itself (`webview/main.ts:602`). That is an action, not a field. Force it into the
descriptor array and an escape-hatch callback appears within a day.

Commands replace the synthetic-click bus: the keyboard handler dispatches the same command
the button does, instead of calling `.click()` on it.

### File separation

esbuild is already the bundler, so real separation costs one config line:

```js
// esbuild.mjs — webview config
loader: { '.html': 'text', '.css': 'text' },
```

giving `component.html` / `component.css` / `component.ts` triplets with genuine syntax
highlighting, formatting and linting.

### The document shell is not a component template

The webview document and the app component are different things, and the split is forced
by CSP:

- **Host keeps ~15 lines**, because they are computed per webview at runtime and cannot be
  a bundled text asset: `${webview.cspSource}`, the `${csp}` nonce, and the `${style}` /
  `${script}` `asWebviewUri` outputs.

  ```html
  <link href="${style}" rel="stylesheet">
  <raw-app></raw-app>
  <script nonce="${csp}" src="${script}"></script>
  ```

- **`raw-app-component/index.html` holds only the app's inner markup** — toolbar, stage
  and status mount points. No `<head>`, no CSP meta, no script tag.

`renderHtml` drops from ~130 lines of markup to that shell. `formatOptionsHtml` and
`escapeHtml` are deleted; `<format-select>` builds its own options from the format
registry it already has in-bundle.

### Proposed webview layout

```
src/webview/                     # browser side only — never imports vscode
  main.ts                        # ~40 lines: defineComponents, route messages, post ready
  vscodeApi.ts                   # acquireVsCodeApi() exactly once, typed post()
  state/
    store.ts                     # entries/order/selectedId + change notification
    viewState.ts                 # zoom, fitToWindow, frameTiles
  controls/
    descriptors.ts               # the field descriptors
    commands.ts                  # the command set
    primitives/                  # riv-select, riv-toggle, riv-number, riv-range, riv-button
  components/
    raw-app/       .ts .html .css   # root: message routing, owns state
    raw-toolbar/   .ts .html .css   # builds fields from descriptors
    format-select/ .ts              # optgroups from the format registry
    raw-stage/     .ts .html .css   # canvas, grid, empty, probe
    raw-status/    .ts .html .css
```

## Design — host side

### `Viewer` was four responsibilities; the split is half-landed

The old `Viewer` class is deleted. It held four jobs, and the target homes were:

| | Responsibility | Target | State |
| --- | --- | --- | --- |
| a | webview lifecycle + message bridge | **`WebViewHost`** — generic, no raw-image knowledge | class exists, body incomplete |
| b | decode-options state + persistence | `DecodeOptionsStore` (currently `SettingsController`) | half-moved, not renamed |
| c | source streaming + file I/O | `SourceReader` | class exists; `sendInitial` still in `WebViewHost` |
| d | export | `ExportController` — new | **not created**; `savePng` still in `WebViewHost` |

The naming rule that drove this: renaming `Viewer` to `WebViewHost` *before* moving b/c/d
would have made the name lie — claiming less than the class does. A vague name gets
investigated; a confident wrong name does not. That constraint still applies to what's
left: `WebViewHost` is not accurate until `savePng` and `sendInitial` move out.

The end state is **two** names, not one:

- `WebViewHost` — transport. Owns the `vscode.Webview`, nonce/CSP, post/receive, disposal.
- `ViewerSession` — the conversation. What `init` contains, what each inbound message
  means. Depends on `WebViewHost`, `SourceReader`, the config controller and the store.

`ViewerSession` does not exist yet. Its absence is why `WebViewHost` currently reaches for
`this.sources`, `this.mode`, `this.title` and `this.onOpenItem` — session state that has
no owner.

### Two creation paths, deliberately

- `ViewerWindowController.openGallery` → constructs directly — command-driven
- `RawEditorProvider.resolveCustomEditor` → constructs directly — VS Code-driven, no command

`openSingle` creates **none** — it delegates to `vscode.openWith` and loops back through
the custom editor provider. This is intentional and should stay: it keeps a single
construction path for single-file viewers. Don't "optimise" it into a direct construction.

### The host sends state; it does not trigger render

Keep this phrasing in the protocol. The host posts state and the webview decides when to
paint, which keeps `rAF` scheduling, coalescing and backpressure webview-side where they
belong.

### Configuration: one reader, typed, with selective propagation

Two distinct persistence layers, currently easy to confuse because both were called
"settings":

| Layer | Mechanism | Contents | Owner |
| --- | --- | --- | --- |
| Settings | `workspace.getConfiguration` | 10 package.json-declared, user-editable properties | `VSCodeWorkspaceConfigurationController` |
| Remembered view state | `context.workspaceState` (Memento) | `Partial<DecodeOptions>` keyed by buffer URI, invisible to the user | `DecodeOptionsStore` |

`DecodeOptionsStore` rather than `MementoController`: `Memento` is the storage primitive,
so naming the class after it describes where the bytes live, not what they mean — and the
name goes stale the moment it moves to `globalState` or a file. "Store" rather than
"Controller" because it only loads, saves and clears; presenting the reset confirmation
belongs to the `settingsReset` intent resolver, not to the store.

#### Defaults come from package.json already

`config.get('tileSize')` returns the schema default for any *registered* setting. The
second argument to `get()` only applies when the section isn't contributed at all, so a
`DEFAULT_TILE_SIZE_PX = 160` constant beside it is not a source of truth — it is a decoy
that never fires and silently disagrees when the manifest changes.

The reason to pass a default is *typing* (`get<T>` returns `T | undefined`). So the fix is
one typed accessor, not repeated constants:

```ts
function read<K extends keyof ConfigSchema>(key: K): ConfigSchema[K] {
  const value = vscode.workspace.getConfiguration(EXTENSION_KEY).get<ConfigSchema[K]>(key);
  if (value === undefined) {
    throw new Error(`rawImageViewer.${key} is not contributed in package.json`);
  }
  return value;
}
```

`undefined` now means exactly one thing — the property isn't declared — and fails loudly.
Same instinct as `el()`.

**package.json is a compile-time source of truth, not a runtime one.** *Keys* are derived
from the manifest via a type-only import — nothing is emitted, so the manifest never enters
the bundle and `rootDir` is not violated:

```ts
type ManifestProps =
  typeof import('@packageRoot/package.json')['contributes']['configuration']['properties'];

export type ConfigKey = Strip<keyof ManifestProps & string, typeof EXTENSION_CONFIGURATION_KEY>;
```

*Value types* stay hand-written, because a JSON import widens values to `string`/`number` —
the enum unions cannot come from the manifest. Verified: this needs no `resolveJsonModule`
and produces real literal keys.

No `check:config` script is needed for that split. Compile-time `Exclude<…>` assertions can
police manifest-vs-schema drift with zero runtime cost, but they were **deliberately
dropped** as premature; typing is done at consumers instead. If a manifest key ever goes
un-handled silently, that decision is the thing to revisit.

**Validate anyway.** `get<ViewerBackground>('background')` is a cast, not a check — a user
can put any string in settings.json and it arrives unchanged. The existing defensive reads
(`formatRegistry.has(format) ? … : DEFAULT`, `Math.max(0, …)` despite `minimum: 0`) are the
right instinct; the controller is where it stops being ad hoc.

#### Propagation is selective, by update type

The controller owns the **single** `onDidChangeConfiguration` subscription (today there is
one per viewer) and re-emits a typed event carrying *which* keys changed. Each
`ViewerSession` subscribes to that event at construction and disposes with its panel — not
`ViewerWindowController`, which creates windows and should not learn each viewer's update
semantics, and not `ViewerRegistry`, which is a pure collection.

The changed-keys payload is load-bearing, because the ten settings are three kinds and only
one may reach an open viewer:

| Class | Settings | On change |
| --- | --- | --- |
| Presentation | `background`, `tileSize` | **propagate** to open viewers |
| Defaults for new viewers | `defaultFormat`, `defaultWidth`, `defaultHeight`, `defaultOffset`, `defaultLittleEndian`, `defaultAlphaMode` | **must not propagate** — would overwrite what the user set in that viewer's toolbar |
| Read at open time | `maxFileSizeMB`, `galleryIncludeGlob` | no-op; buffers are already loaded |

This is built. `ConfigChangeKind` (`viewer:onOpen` / `viewer:watched` / `viewer:defaults`)
namespaces the kinds, and the controller fires per kind rather than broadcasting one
payload with a flag.

**Known gap:** `ViewerConfigKeySet` types every group as `ConfigKey[]`, so
`ViewerConfigKeySet[ConfigChangeKind.ViewerWatched][number]` widens back to the full union
and `ViewerConfiguration` resolves to the *entire* schema rather than
`background | tileSize`. Verified by probe. The runtime grouping is still correct, so
nothing misbehaves today — but the type no longer prevents a viewer default from being
handed to an open viewer. Consumers must narrow explicitly until the key set carries its
own literals.

## Lifecycle and disposal

`DisposableRegistry` is the single owner, bound to `context.subscriptions` once in
`activate`. `DisposableStore` self-registers in its constructor and unregisters at the top
of `dispose`.

Three constraints, each of which was violated at least once during construction:

- **Registration must not touch the instance.** `register()` runs from the base
  constructor, before the subclass constructor. Anything reading a subclass field there
  sees `undefined`. This is why late registration (into an already-disposed registry)
  defers its `dispose()` by a microtask rather than calling it inline.
- **`unregister` must not dispose.** `dispose()` calls `unregister()`, so an `unregister`
  that disposes recurses infinitely — a real stack overflow, not a theoretical one.
  Disposal is the caller's job; removal is the registry's.
- **Deregistration is what stops the registry becoming a leak.** `WebViewHost` is
  per-panel, not extension-lifetime. Without `unregister` on dispose, every webview ever
  opened is retained for the session.

The accepted trade: self-registration requires an *ambient* registry, which is the one
global in the design. It is bound explicitly at the entrypoint rather than being a
module-scope `new`, and `assignRegistry(null)` makes it resettable. If strict
no-ambient-state is ever wanted, self-registration is the thing that has to go.

Consequence worth knowing: a store can be held both by the registry and by a parent's
`disposables`. Harmless — whichever disposes first unregisters and the second call is a
no-op — but registry `size` fluctuates with panel churn, so a leak assertion should expect
movement rather than a flat line.

## Migration sequence

Each step builds and runs on its own; none is a big-bang.

1. **Shell + build.** Add the esbuild loaders. Move markup out of `renderHtml` into
   component `.html` files, leaving the ~15-line dynamic shell. Delete
   `formatOptionsHtml` / `escapeHtml`; `<format-select>` builds its own options.
   Move control and reference keeping out of `main.ts`.
2. **Descriptors.** Introduce the field descriptors, the primitives and `<raw-toolbar>`.
   Collapse the three switchboards and both listener loops. Introduce commands for the
   eight action controls. This is where the six-site problem dies.
3. **Stage + status components.** Move canvas/grid/probe/status into `<raw-stage>` and
   `<raw-status>`, bodies unchanged.
4. **State off the module.** `entries`/`order`/`selectedId` into a store; view state into
   `viewState`. Keyboard handler dispatches commands instead of `.click()`.
5. **Host-side split.** ⏳ `Viewer` → `WebViewHost` + `ViewerSession`, with b/c/d moved to
   their target homes. Independent of steps 1–4. *Old class deleted; `ViewerSession`,
   `ExportController` and the `SourceReader` handover remain.*
6. **Configuration.** ✅ Typed schema, manifest-derived keys, per-kind change events, four
   scattered `getConfiguration` reads absorbed. *Remaining: rename `SettingsController` →
   `DecodeOptionsStore`, and the `ViewerConfigKeySet` widening above.*
7. **Lifecycle.** ✅ `DisposableRegistry` + self-registering `DisposableStore`, bound to
   `context.subscriptions`.

Steps 1–2 deliver most of the webview value. Steps 3–4 are what make it testable.

## Outstanding work

Honest inventory, worst first.

### 1. The build is red — 59 errors, 10 files

Four root causes, not 59 independent problems:

| Cause | Blast radius |
| --- | --- |
| `@common/*` alias points at a deleted directory (`decode.ts`, `protocol.ts` moved into `features/`) | `webview/main.ts`, `webview/types.ts`, `SettingsController` |
| `@features/viewer/viewer` deleted, still imported | `RawEditorProvider`, `registry/types`, `viewerRegistry`, `ViewerWindowController`, `viewerSourceForUri` |
| `@features/format` never existed — `FormatRegistry` class has no singleton | `WebViewHost`, `webview/main.ts` (×3) |
| `WebViewHost` / `SettingsController` hold pasted `Viewer` bodies without the fields | 27 + 14 errors, incl. `await` in non-async methods |

The last one is the real work: those bodies reference `this.sources`, `this.mode`,
`this.title`, `this.ready`, `this.onOpenItem`, `loadOptions`, `saveOptions` — state that
belongs to the missing `ViewerSession`. Creating that class is what unblocks it; the other
three causes are import fixes.

### 2. The extension renders nothing

`renderHtml`/`prepareWebviewHtml` returns `''`, and `media/viewer.css` is deleted while the
`asWebviewUri` call still points at it. The CSS now lives in
`raw-app-component/index.css`, which nothing serves. **Even once the build is green, a
viewer opens blank.** Smallest useful milestone: restore a working shell before starting
the component work.

### 3. Webview redesign — steps 1–4, in flight

`main.ts` is a composition root and the component tree decodes end to end. The six-site
problem is solved: `TOOLBAR_CONTROLS` describes each control once and markup, wiring,
reading and writing all derive from it. Component stylesheets are settled too —
constructed `CSSStyleSheet`s adopted per shadow root, so `style-src` never comes up.

What is left in `main.refactor.ts` is the interactive layer rather than the rendering one:
pixel probe, PNG export, zoom/fit, frame tiles and the dimension-guess picker. See
**Shipping a first version** in `PROJECTSTATE.md` for the ordered list.

### 4. Smaller, independent

- **1 remaining lint error** — one `any` in `utils/pipe.ts`.
- **`SettingsController` → `DecodeOptionsStore`** rename, plus moving its
  `showInformationMessage` out to the `settingsReset` resolver.

## Risks and gotchas

- **`acquireVsCodeApi()` may only be called once per webview.** Must be a single module
  (`vscodeApi.ts`) that everything imports. Splitting into components makes it easy to
  call it twice by accident — throws at runtime, not build time.
- **Registration timing.** See the init-order chain above. `ready` after every `define()`.
- **Wrong-side imports fail silently.** See the process boundary section. Worth a lint
  rule (`no-restricted-imports` banning `vscode` under the webview root) since the
  compiler won't help.
- **`retainContextWhenHidden: true`** is set on all panels, so webview state persists
  across tab switches. `disconnectedCallback` must not assume teardown means the viewer is
  gone.
- **Light DOM means one cascade.** Namespace component selectors by tag name.
- **No test harness exists.** Step 4's justification is testability, but there is no
  runner. Worth adding one (node + happy-dom, or `@vscode/test-electron`) before or
  alongside it, otherwise "testable" stays theoretical.

## Open items

Decisions, not tasks — each needs a call before the code that depends on it.

- **Memento prefix changed without a migration.** `rawImageViewer.options:` →
  `rawImageViewer.settings:` (`SettingsController.ts:3`). Every existing user's remembered
  decode options becomes unreachable, and because the reset command filters on the new
  prefix the old keys are also unresettable — orphaned in workspace state permanently.
  Keep the old prefix, or read both and migrate on access. **Decide before shipping.**
- **Injected `<style>` will be blocked** by `style-src ${webview.cspSource}` if components
  inject CSS at runtime — silently, as unstyled components. Either concatenate at build
  time and keep the `<link>`, or add `'nonce-${csp}'` to `style-src` and set the IDL
  property `styleEl.nonce` (not `setAttribute`). **Decide before writing the first
  component.** CSSOM writes like `el.style.setProperty('--tile', …)` are unaffected.
- **`getNonce()` uses `Math.random()`**, not a CSPRNG (`webview/utils.ts`). Low practical
  risk — buffers travel by `postMessage`, not interpolated into HTML — but
  `randomBytes(16).toString('base64')` is a two-line fix.
- `getState`/`setState` on the `acquireVsCodeApi` handle are declared but unused. No
  decision on whether they should back view-state persistence, given
  `retainContextWhenHidden` already covers the common case.
- Whether to restore compile-time manifest/schema drift assertions, or keep narrowing at
  consumers. Currently the latter, deliberately.

Resolved since the last revision: `decodeImagRle` deleted, `ViewerCoonfiguration` typo
fixed, `viewer.ts` decomposed away, `unregister` recursion fixed.
