# Project state description

## Goal

A simple straightforward viewer VSCode extension for raw binary files.
With ability to provide a gallery view of multiple files.

- *potentially* with provision of custom parsers for specific file types.

Should support main 16, 24, 32 bit color formats, and some common pixel formats (like YUV).

With the ability to export the view to a PNG image.

- *potentially* can be added support for merging multiple files into a single view, with ability to specify offsets and sizes for each file.

## Current state

Provided a simple viewer for raw binary files, with ability to provide a gallery view of multiple files. Works as a POC as of now, with some basic features implemented:

- Viewer for raw binary files, with ability to provide a gallery view of multiple files.
- Support for main 16, 24, 32 bit color formats, and some common pixel formats (like YUV).
- Ability to export the view to a PNG image.
- Build passes and tests run successfully.
- vsix package is generated successfully and was succesfully installed in VSCode with local testing.

The webview rewrite is past its midpoint. The new pipeline decodes end to end — host reads a
file, posts an `ArrayBuffer`, the items slice fans it out, `riv-image` decodes to an
`ImageBitmap` and blits it — and the toolbar drives every decode option through
`DecodeSlice`. What remains in `main.refactor.ts` is the interactive layer: pixel probe,
PNG export, zoom, frame tiles and the dimension-guess picker.

Both bundles build. `tsc` is still red in five files, all of them either the reference
implementation or work parked mid-port (see [Shipping a first version](#shipping-a-first-version)).

## Next steps

### Improvements

- Move covered file extensions to a vscode configuration menu of the extension, so that users can add their own file extensions to be covered by the extension. If it is possible.
- Add support for custom parsers for specific file types.
- Add support for merging multiple files into a single view, with ability to specify offsets and sizes for each file.
- Improve UI separation in a toolbar by groups:

  - Size: width, height
    - Add more default pressets, eg.: 16x16, 32x32, 64x64, 96x64
  - Format: color format, pixel format,
  - Header: offset, size, etc.
  - Export: export to PNG, export to other formats (if possible)

- Add RMB action on gallery item to show the selected image in explorer view.
- Add memo of the selected toolbar options, so that user does not have to reselect them every time.
- Add custom header presets support with related config/parser
- Add script builders in a webview worker gated on Workspace Trust
- Add serialization of the webview with `WebviewPanelSerializer`.
- Add offload testing on webview activity state change: 'visible', 'background'. However, for now I've set `retainContextWhenHidden` to true, so that the webview is not disposed when hidden.
- Add image lazy load on open, if needed, to improve performance on large files.
  - However gallery view is expected to load all the selected images 1 by 1, as it does now already.
  - `BufferItem.fromFileSource` currently reads every file eagerly; gallery entries should stay stubs until opened.
- Add image source streaming support for large files.
  - Intended route: stop transferring bytes over `postMessage` entirely and serve them via `webview.asWebviewUri(source.uri)` + `fetch` in the webview, which gives ranged reads, laziness and caching for free. Friction is `localResourceRoots` (must contain the file's directory) and non-`file:` schemes, which will not work at all.
- Handle canvas dimension limits (~16384px per side plus a total-area cap) for large sensor dumps — long term this means drawing only the visible region via `ctx.setTransform` rather than sizing a canvas to the image. Ties into the existing frame-tiles option.
- Add toolbar or the whole UI caching to avoid redundant recalculations and avoid flickering during switching views.
- Add tests

### General refactor

Since the code here is merely POC, it is not well structured and needs a general refactor to improve maintainability and readability.

- Rewrite webview DOM components structure from html injection to custom elements, with proper separation of concerns and encapsulation.

#### Current refactor state

- decomposed extension entry point.
- introduced extension host responsible for main extension functionality provision (e.g. registering commands, cleanup)
- introduced intent-based architecture for command handling and communication between vscode-registered commands and extension functionality
  - introduced intent dispatcher responsible for dispatching intents to appropriate resolvers
  - introduced intent resolvers responsible for resolving intents to appropriate extension functionality
  - introduced command intent parsers responsible for parsing command arguments to intents and commad map for intent registration

- implemented basic defined viewer structure and functionality
  - provided viewer window controller for managing viewer window lifecycle and communication with webview
  - provided viewer registry for managing viewer instances and their lifecycle
  - introduced viewer-related intents and their resolvers as a seam b/w vscode commands and viewer functionality

- introduced strong vscode API integration with vscode API types, guards and utilities
- provided raw document class as a basic integration layer of `vscode.CustomDocument`

- built full-scale configuration controller with config typing, validation and ability to derive keys/values from packae.json

- added proper disposables management with `DisposableRegistry` and self-registered `DisposableStore`, added respective lint rule as abetter safe-net.
  - teardown now unwinds LIFO, so a dependency is disposed after its dependents
  - a throwing `dispose()` is isolated, so one bad object cannot leak everything registered after it

- decomposed viewer into multiple services/controllers.
- WebView host defined as a proper representation of it's goal and zone of responsibility.

- introduced an application context as the ambient seam for cross-cutting dependencies
  - `AppContext` + `AppContextProvider`: static read, instance write, single instance via `create()`, throws when read before assignment
  - established the wiring rule this whole architecture leans on: **explicit injection at the composition root, ambient reads only for objects constructed later** (in practice, only webview components)

- rewrote the webview as a second application with its own composition root
  - `main.ts` mirrors `activate()`: builds the store, the context provider, the bridge, both dispatchers and the session
  - `WebviewContext` + `WebviewContextProvider` mirroring the extension-side pair, so one mental model covers both processes
  - `ReactiveStore` built on native `EventTarget`, so components subscribe through the existing `listenTo` / `WebviewDisposableStore` plumbing instead of a bespoke observer
  - `BufferItemRegistry` rebuilt on a `Map`: upsert semantics (a loaded item replaces its stub without changing position), O(1) lookup, snapshot-only `entries`

- unified both webview input edges behind resolver maps of the same shape
  - `WebviewHostMessageDispatcher` + `WEBVIEW_HOST_MESSAGE_RESOLVERS` for extension -> webview messages
  - `WebviewCommandDispatcher` + `WEBVIEW_COMMAND_RESOLVERS` for DOM -> logic commands
  - discriminant unified to `type` across both buses (`WebviewCommandKind` -> `WebviewCommandType`), leaving all three dispatchers structurally identical
  - both maps are exhaustive over their key union, so a new message or command type is a compile error until handled
  - `WebviewSession` reduced to lifetime ownership and wiring; each dispatcher owns its own subscription

- started the custom elements rewrite
  - `RIVHTMLElement` base: shadow-root mount from an imported template string, memoised `ref()` lookups, and command events marked `composed` so they cross shadow boundaries
  - per-component folders are self-contained — `index.ts` imports its own `index.html`, with no template lookup in the host document and no ids leaking into the shell
  - `riv-image` renders through a canvas rather than an `<img>`: raw formats have no encoder, and `imageSmoothingEnabled = false` is what makes pixel inspection usable

- fixed the extension <-> webview data path
  - items transfer as `ArrayBuffer` instead of base64 (supported since vscode 1.57), removing a ~33% payload penalty, a full copy and encode on the extension host thread, and a per-byte `charCodeAt` decode loop in the webview
  - introduced `BufferItemData` as the wire shape: `postMessage` serialises, so the webview receives plain objects and must never depend on the `BufferItem` class
  - quarantined `BufferItem` from the shared barrel — it imports the vscode API, and a barrel import dragged it into the webview bundle (`Could not resolve "vscode"`)
  - fixed pooled-`Buffer` slicing that shipped the wrong bytes for files under 4 KB
  - webview CSP now derives from `webview.cspSource` and permits styles, images, fonts and connections rather than scripts alone

- routed store updates per item instead of per batch
  - `ReactiveStore` now emits granular signals — `StoreEventType.Order`, `.ViewMode`, `.Selection`, and a per-item `itemEventType(id)` — so a late-arriving buffer wakes one component instead of the whole tree
  - `mode` (single/gallery) and `selectedId` moved into the store, with `visibleIds` deriving what the renderer should show from both
  - `riv-gallery` owns the keyed list: it reconciles `<li>` entries against `visibleIds`, reusing nodes by id and inserting in place rather than rebuilding
  - `riv-image` pulls by id — it takes an `item-id` attribute and subscribes to that item's event alone, so entity components read from the store and never leaf to leaf

- laid the groundwork for splitting the store into slices
  - `TypedEventTarget` wraps `EventTarget` with an event map, so `on`/`emit` are checked against the detail each event actually carries
  - `StoreSlice` is the abstract base: own state, `set`/`patch`/`reset`, and a `change` event carrying `{ prev, next }`
  - slices namespace their events by name at the type level (`'selection:change'`), so several can share one bus without colliding and subscribers still get the detail typed
  - `change` is pinned by the base rather than read out of the subclass event map — a slice that could redefine it would leave `set()` unable to emit its own event
  - not wired up yet: `ReactiveStore` is still the live store, `StoreSlice` has no subclasses

- rebuilt the store as a slice registry
  - `ReactiveStore` is a registry and nothing else: slices in, bus out, no domain methods.
    An item question is `ItemsSlice`'s to answer, a decode question `DecodeSlice`'s
  - `ItemsSlice` is copy-on-write, so `set`'s identity guard works and a subscriber can
    tell whether *its* item moved by comparing `prev.byId.get(id)` against `next`
  - `DecodeSlice` owns the options *and* the decode call — a bitmap is only meaningful for
    the options it was produced under, so `decode:change` means "your pixels are stale"
  - cross-slice reads are selectors (`store.selectors.visibleIds()`), cross-slice writes
    are reactions. `reconcileSelection` subsumed two rules, one of which was never
    implemented: removing the selected item used to leave `selectedId` dangling
  - per-item event names were dropped for one `items:change`. Measured first: the keyed
    routing saved 12 ms across a 500-file load against ~1.4 s of decode for the same load

- gave components a state machine and a view
  - `RIVViewState` holds a component's state and routes updates through named transitions;
    handlers take raw material and return the state, so there is one place a state is made
  - `RIVView` owns the shadow root and the DOM writes; the element is left with lifecycle,
    subscriptions and orchestration
  - `riv-image` runs on it end to end: an `AbortController` supersedes in-flight decodes,
    and bitmap lifetime belongs to the state transition, which retires by difference —
    anything the settled state does not reference is closed, incoming or outgoing

- ported the decode toolbar
  - one `TOOLBAR_CONTROLS` table describes each control once; markup, event wiring, reading
    into options and writing back all derive from it. The old toolbar spread each control
    across six sites the compiler could not link
  - `ElementBuilder` dispatches on a tag descriptor discriminated all the way down, so a
    checkbox cannot carry a `min` and a select cannot arrive without choices
  - control availability is derived from what each format declares about itself
    (`endianSensitive`, `bitOrderSensitive`, `hasAlpha`), replacing a hand-written
    `updateControlAvailability` that had to be edited in step with the markup
  - one delegated `change` listener rather than eleven; `change` is `composed: false`, so
    it binds on the shadow root

- wired component styling
  - constructed `CSSStyleSheet`s cached by source text and adopted into each shadow root:
    one parse per component class, and no `style-src` question to answer
  - design tokens live on `:root` in `shell.css` and inherit through shadow boundaries;
    the gallery hands `riv-image` three custom properties, which is the only styling that
    crosses into a child's shadow root


#### Known gaps

- store events are granular but not coalesced. A batch of items dispatches one signal per
  item synchronously; a microtask-batched flush would collapse a multi-file open into a
  single render pass.
- decode still runs on the webview main thread. `WebviewImageDecoder` is the only file a
  worker move would touch — callers already await and the abort signal already threads
  through — but the move has not been made.
- `AppContext.workspaceConfig` is typed as the concrete controller, so every consumer can
  reach `dispose()` on it. Wants a narrow `ConfigReader` (`read` + `onDidChange`).
- `VSCodeWorkspaceConfigurationController` never exposes its emitter, so config change
  events fire into nothing and nobody can subscribe. Needs a public `onDidChange` before
  the context can narrow.
- settings sync between host and webview is not built. Decide up front whether messages
  carry an origin tag or the webview simply never re-posts what it received — the echo
  loop is cheap to design out and miserable to debug.
- no test harness. Behaviour is currently verified by bundling throwaway scripts with
  esbuild and running them under node, which works but is not checked in.
- `main.refactor.ts` remains the reference for the unported interactive features and does
  not compile. It goes when the list below is empty.

## Shipping a first version

The README already promises the feature set, so "v1" means the manifest and the README
stop lying.

### Landed since the last pass

- workspace `default*` settings now load into `DecodeSlice` on open
- gallery tiles select on click and open in their own tab on double-click
- PNG export works end to end, from the palette command and from a toolbar button, over
  one shared `exportSelected` chain. Transfer is an `ArrayBuffer`, guarded on the host
  against a payload that did not survive serialisation — **pending a real-webview test**
- toolbar controls split into value and action controls by binding rather than tag
- **fixed: only checkboxes updated decode options.** `readElementValue` guarded on
  `Object.hasOwn(element, 'value')`, but `value` is a WebIDL accessor on the prototype, so
  the check was false for every real input and select and they all read as `''`

### Scope, in dependency order

Each item names what it depends on. Nothing below is started.

0. ~~**Test harness with a real DOM.**~~ **Landed** — see *Testing* below.
1. ~~**Status bar.**~~ **Landed.** Segments are a table (`riv-status-bar/segments.ts`), so
   zoom, probe and frame position each add one entry. Geometry is re-derived per render
   from the shown buffer and the options, and a header preset the bytes cannot satisfy
   shows as an error note rather than throwing.
2. **Zoom controller** — fit, 1:1, step in and out. Single mode renders at intrinsic size
   and scrolls today; that stays the default, zoom is the way in. Reports into the status
   bar.
3. **Keyboard shortcuts.** `-` `+` `f` `0` for zoom, `←` `→` for frames. The manifest
   declares no keybindings, and the reference drove these from one `keydown` handler.
4. **Pixel probe** — needs the status bar. `PixelProbe` and `PixelLocator` exist and are
   unwired. Does *not* need zoom: the reference maps mouse to pixel through
   `getBoundingClientRect()`, which is scale-independent.
5. **Frame navigation and frame tiles** — README feature. `DecodeOptions.frame` and
   `Geometry.frameCount` decode correctly; nothing steps through frames or lays them out.
6. **Backdrop choice and tile size** — needs the config emitter exposed. `background` and
   `tileSize` are declared and validated, then read by nobody: the CSS hardcodes a
   checkerboard and `--riv-tile: 220px`. They are the "watched" keys meant to update open
   views live, but `VSCodeWorkspaceConfigurationController` keeps its emitter private, so
   nothing can subscribe.
7. **Dimension-guess picker** — README feature. `guessDimensions` fills empty width and
   height silently; the ranked-candidate dropdown that lets the user choose is unported.
8. **Remember decode options between views.** Built, then removed pending review.

### Testing

`npm test` runs vitest 4.1.11 in two projects that mirror the two esbuild targets: webview
code under `happy-dom`, extension-host code under plain Node, so host code cannot lean on a
`document` it will never have. 106 tests across 13 files, co-located as `*.test.ts`.

- **Resolution matches the build.** `tsconfig-aliases.mjs` is shared by `esbuild.mjs` and
  `vitest.config.mjs`, and `.html`/`.css` load as text through Vite's `?raw`, mirroring
  esbuild's text loader. Extracting it left both bundles byte-identical.
- **`vscode`** resolves to `src/test/mocks/vscode.ts` in tests — `vi.fn()`s, grown as needed.
- **The toolbar is tested mounted**, as a real custom element with real `change` events,
  which is the path the checkbox-only bug lived on. Both the unit and mounted tests were
  mutation-checked against the original `hasOwn` reader.
- **Known happy-dom gap:** reading or writing `select.value` makes it an own property
  (happy-dom's proxy binds accessors onto the instance; browsers never do). Drive selects
  via `option.selected`. A mounted component whose render reads `select.value` cannot catch
  own-property bugs on selects — cover that with a unit test on a fresh element.
- **Known happy-dom gap:** `:empty` ignores text nodes, so an element holding only text
  still matches it (Chrome and the spec say it does not). Check emptiness through
  `childNodes` in tests; the status bar's telltale selector relies on the real behaviour.
- **Pseudo-elements do not render** in happy-dom. The status-bar telltales were checked
  with headless-Chrome screenshots at 1x and 2x, light and dark.
- **Canvas is stubbed.** happy-dom has `OffscreenCanvas` but no 2D rendering, so painting
  and PNG encoding stub the context; everything around them runs for real.
- Runs on Node 20.18, 20.19, 22.16 and 23.11. Vitest 3.x was avoided because every release
  before 4.1.11 carries GHSA-82fw-gwwq-j7x9. **Adding or upgrading vitest needs npm 11** —
  npm 10.9.2's arborist crashes resolving 4.x's peers — but installing from the lockfile
  works on npm 10.9.2.
- `npm test` does not gate `npm run package` yet.

### The decode chain

```
sources -> buffer items (bytes)  ->  geometry on the item  ->  store decodes what is visible  ->  components render
              ItemsSlice            resolveItemGeometry          VisibleImageDecoder              riv-image
```

- **Geometry belongs to the decode, not the view.** `DecodeSlice.resolveGeometry` measures a
  buffer with the decoder's own resolver, and the `resolveItemGeometry` reaction stores the
  result on the item: `pending` -> `resolved` | `failed`. Everyone reads it; nobody
  re-derives it, and `ImageDecoder.decode` now takes it rather than measuring again.
- **The store owns decoding, for what is on screen and nothing else.** `VisibleImageDecoder`
  keeps `ImagesSlice` in step with the visible ids: `pending` -> `ready` | `empty` | `failed`.
  All of the asynchrony lives there — aborting a decode the options outdated, and closing a
  bitmap that arrives after its turn.
- **`ImagesSlice` is the only owner of an `ImageBitmap`.** What it drops, it closes, so no
  component carries a lifetime rule. `riv-image` subscribes to one event and renders what it
  is told; it starts no decode and closes no bitmap.
- Passes are coalesced onto a microtask, so a change that arrives as two events (the item,
  then its geometry) decodes once.

**Why not simply store every decoded image** (measured 2026-09-21, `ImageDecoder` on the
samples dir, 3,931 files / 122.7 MB raw):

| | cost |
| --- | --- |
| Geometry for every item | 1 ms (width given), 67 ms (guessed) |
| Decoded RGBA for every item | 245 MB at rgb565, 491 MB at gray8, **3.9 GB at gray1** |
| Decoding the ~24 tiles on screen | 6.9 ms, 1.5 MB |
| Re-decoding everything on one option change | 0.4-0.7 s, per keystroke |
| One probe pixel from the source bytes | 1.1 us |

Decoded RGBA is 1x-32x the raw size, and the formats this tool exists for are the worst
end of that (`gray1` 32x, `gray4` 8x, `gray8` 4x). Pixels stay transient and bounded by the
screen; the pixel probe reads from the source bytes instead of stored RGBA.

**Still open:** the gallery has no virtualisation, so every item is "visible" and gets
decoded — as before this change. Once tiles virtualise, the store's footprint follows
automatically, because it decodes exactly what `visibleIds` reports.

### Async discipline

- **Lint is type-aware** for `src/**/*.ts`: `no-floating-promises` with `ignoreVoid: false`
  and `checkThenables: true` (the host runs on VS Code's `Thenable`), plus
  `no-misused-promises`. A `void` on a promise is a lint error.
- **Async work started from a sync edge** — a DOM listener, a VS Code event callback —
  goes through `attemptDetached(run, recover)`, never `void`. Used by the command
  dispatcher, `riv-image`'s render and `WebviewHost`'s message listener.
- **A flow the user should hear about owns its boundary** (`exportSelected` posts an
  `app:status` error). The edge's `recover` is the last resort and only logs.
- **Notifications go through `InfoMessageController`**, which detaches them in one place:
  their promise settles on dismissal, so nothing awaits one unless it needs the clicked item.
- **Lint's blind spot:** an async function handed to a listener typed `=> any` (VS Code's
  `Event`) is not flagged. `WebviewHost.test.ts` covers that edge instead.

### Housekeeping before packaging

- `npm run package` gates on `typecheck`, red in two files:
  - `main.refactor.ts` (5) — deleted once 1–7 are ported
  - `viewer/registry/types.ts` (1) — imports a `Viewer` class that no longer exists. It is
    worse than a red line: the unresolved import makes `ViewerRegistryEntry.viewer` an
    `any`, so the registry's consumers are not type-checked. `Viewer` -> `WebviewHost`.
- `src/utils/pipe.ts` has no callers and holds the last lint error. The export chain uses
  a native promise chain instead.
- **The `.vsix` would ship 146 MB of samples.** `vsce ls` lists 4,779 files, 4,757 of them
  under `samples/raw/`. Also shipping: `.claude/settings.local.json` (machine-local config
  that should not be public), `docs/`, `eslint.config.mjs` and `.gitignore`.
  `.vscodeignore` needs a pass; the test harness files are already excluded.
- Nothing has run in a real VS Code webview yet. The harness closes most of that gap but
  not all — canvas rendering and the `ArrayBuffer` export transfer still need a real run.

### Explicitly not in v1

- decode in a worker
- event coalescing
- streaming large files via `asWebviewUri`
- webview serialization (`WebviewPanelSerializer`)
- custom header presets

0. Real-DOM test harness → 1. Status bar → 2. Zoom → 3. Shortcuts → 4. Probe → 5. Frames → 6. Backdrop + tile size → 7. Guess picker → 8. Remember options.