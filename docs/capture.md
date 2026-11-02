# Capturing a framebuffer

> **Status: planned, not implemented.** Nothing described here exists in the code yet. This is the
> design and the order it should land in. Phases are at the bottom.

rawviewr can only look at bytes that are already a file. The thing you actually want when debugging
a display pipeline is to *grab* the framebuffer now — and the formats it already decodes
(`xrgb8888`, `bgra8888`, `rgb565`, the packed YUVs) are exactly what real framebuffers hold.

The extension will not read `/dev/fb0` or drive a GPU itself. Every platform already has a tool for
that, and they agree on nothing. So the extension **runs a program you name in your settings**,
takes the bytes it produces, and opens them. It never knows what the program did.

## What already does the work

A framebuffer needs exactly the decode options the toolbar already has:

| Framebuffer fact | Existing option |
| --- | --- |
| pixel layout | `DecodeOptions.format` — 37 presets |
| stride / pitch padding | `DecodeOptions.bytesPerRow` ("bytes per row including padding") |
| leading header bytes | `DecodeOptions.offset` |
| N frames concatenated | `Geometry.frameCount` + `DecodeOptions.frame`, honoured by `PixelLocator` |

`stride ≠ width × bpp/8` on real hardware, and `bytesPerRow` is already the answer.

One consequence worth stating, because it is why this design is cheap: **raw output is forgiving.**
`-f rawvideo` has no trailer, and `GeometryResolver` computes
`frameCount = floor(availableBytes / bytesPerFrame)`, so a partial trailing frame from a hard-killed
tool is simply ignored. A container format would not survive that. Recording needs **no new decode
support at all**.

## Security

Three independent layers. The first is the actual enforcement; the others are the belt.

1. **`scope: "machine"` on every `capture.*` setting.** Only `application` and `machine` cannot be
   set by workspace or folder settings; an omitted `scope` defaults to `window`, which a workspace
   *can* set. **None of the 10 existing settings declares a scope** — harmless for `tileSize`, not
   harmless for a program name. Strictly only `command`, `args` and `saveFolder` need it; all seven
   get it so "every capture setting is machine-scoped" is verifiable at a glance.
2. **`capabilities.untrustedWorkspaces`** with `supported: "limited"` and `command`/`args`/
   `saveFolder` in `restrictedConfigurations`. In Restricted Mode VS Code then returns only the
   *user-defined* value, so a workspace value is never even read.
3. **`vscode.workspace.isTrusted` checked inside the controller**, not just in the resolvers, so a
   future toolbar button cannot bypass it — plus `"when": "isWorkspaceTrusted"` on the palette
   entries. Refuse by returning `null` with a warning; never throw (`tryDispatchIntent` re-throws
   after showing an error, so a refusal must not look like a crash).

**Conscious side effect:** `capabilities` is absent today, which means the extension is **disabled
entirely in Restricted Mode**. Declaring `limited` enables it there for the first time. That is
probably right — it reads bytes and paints them into a CSP'd webview, never evaluating file content,
and viewing a `.bin` in an untrusted clone is what a hex editor does. But it makes the decode path
reachable from an untrusted repo's files, and that path is where this project's sharp edge was.
**So `FileValidator`'s size guard must come back in the same phase** (see Prerequisite below).

**No shell.** `command: string` + `args: string[]`, spawned with `shell: false` explicitly. The
argv the extension executes is exactly the argv visible in your settings, with no quoting or
word-splitting rules in between. `${output}` substitutes into argv *elements*, and its value is a
path we generated inside our own storage — never user input. Want a pipeline? Set `command: "sh"`,
`args: ["-c", "…"]`; the shell is then visible in your own settings instead of hidden in ours.

Do **not** reuse `StringTemplate` for substitution: it uses `{{token}}` rather than the `${…}`
convention, and it *throws* when a token is absent — which is the normal case for argv, where most
elements contain no placeholder.

## Settings

Seven properties under `rawImageViewer.capture.`, all `scope: "machine"`:

| key | type | default | notes |
| --- | --- | --- | --- |
| `command` | string | `""` | run directly, **not** through a shell; absolute path if not on the host's PATH |
| `args` | string[] | `[]` | one argument per element, never one string; `${output}` substituted per element |
| `output` | `stdout` \| `file` | `stdout` | who writes the file — the tool, or us from its stdout |
| `stopWith` | `sigint` \| `sigterm` \| `stdin-q` | `sigint` | how a recording is ended gracefully |
| `timeoutSeconds` | number | `60` | hard deadline, also covers a one-shot that hangs |
| `maxOutputMB` | number | `256` | runaway guard |
| `saveFolder` | string | `""` | empty ⇒ ask with a save dialog |

Dotted names on purpose: `Strip` in `src/types/global.d.ts` removes only the first segment, so
`capture.command` survives into `ConfigKey` intact, and VS Code renders the group as **Capture:
Command** in the settings UI. The cost is quoted members in `ViewerConfigSchema`, which is cheap.

`output` is explicit rather than derived from "does `args` contain `${output}`" — that rule
misreads a tool taking a path for some other reason, and makes a settings change behave non-locally.

**Compile-time contract.** `ConfigKey` is derived from the manifest by a type-only import, so adding
these is a **compile error until every total map is updated** — which is the point. In the order
`tsc` reports them:

1. `shared/features/settings/configuration/types.ts` — seven quoted members on `ViewerConfigSchema`.
2. `extension/features/settings/VSCodeWorkspaceConfig/validators.ts` — `CONFIG_VALIDATORS` is total
   over `ConfigKey`. Reuses `asString` / `asClampedInt` / `asEnumMember`; needs one new
   `asStringArray` (reject non-arrays, reject non-string elements, **copy** the array).
3. `src/definitions/capture.ts` — **new file** for the `CaptureOutput` / `CaptureStopWith` enums.
   They cannot live in a capture feature folder: `ViewerConfigSchema` is in `@SHARED`, which eslint
   forbids from importing `@EXTENSION/*`. `@definitions` sits outside the domains and shared already
   imports `Endian` from it, so there is precedent and no new rule.

Deliberately **not** touched: `VIEWER_CONFIG_KEYS`. Its `satisfies` only requires listed keys to be
`ConfigKey`s, not the reverse. Capture settings are read per run, nothing re-renders on them, and
`detectConfigKeyChangeKind` only ever sees keys in `all` — so leaving them out is safe. Pin that
with a test rather than leaving it to be rediscovered.

Inject a narrow reader, not the concrete controller — `ConfigReader = { read(key) }`.
`docs/PROJECTSTATE.md` already lists this as a known gap, so it is a free down-payment.

## Commands

Five, following the existing two-stage path (`CommandNames` → `COMMANDS` table → `parseToIntent` →
`IntentKind` → `IntentDispatcher`): `captureFrame`, `captureStart`, `captureStop`, `saveCapture`,
`useCapturePreset`. All intents are payload-free — the command is in settings, the output path is
ours, and the invocation carries nothing worth parsing.

`CAPTURE_INTENT_RESOLVERS(capture, opener)` returns a `Pick<IntentResolverMap, …>`, spread into the
dispatcher in `extension.ts` exactly like `VIEWER_INTENT_RESOLVERS`. `opener` is `windowController`
typed as the existing `UriOpener` contract, so the controller never learns about viewers.

**Do not contribute a keybinding.** `table.test.ts` runs `it.each(keybindings)` asserting that
*every* contributed chord carries `!rawImageViewer.fieldFocus` and the view-scoped `when` clauses —
so a global capture chord silently requires narrowing a safety test that exists for a bug that
actually happened. If a chord is ever wanted, narrow that `it.each` to the zoom commands first, as
its own explained change.

## Running the child

`CaptureController extends DisposableStore` (it owns a child process, a tick, a deadline, a status
bar item; and eslint's `no-restricted-syntax` rejects a hand-rolled disposables array anyway). One
run at a time. Note in the file that `dispose()` is **synchronous**, so teardown can only *fire* the
kill, never await exit — which is part of why the deadline exists even when nobody presses stop.

- `spawn(command, argv, { cwd: storageDir, shell: false, detached: false, windowsHide: true })`.
- **A listener on `'error'` is mandatory** — an `error` event with no listener throws out of the
  emitter. It is also the likeliest real failure: a GUI-launched VS Code on macOS does not inherit
  the login shell's PATH, so Homebrew's `ffmpeg` and the Android SDK's `adb` are routinely not
  found. Say that in the message rather than surfacing a bare ENOENT.
- Resolve on **`'close'`, not `'exit'`** — `close` fires once stdio is closed, which is what
  guarantees the file is complete. Await the sink's close too, or `openSingle` can read a
  half-flushed buffer.
- **Windows `.bat`/`.cmd` cannot be spawned without `shell: true`** since the CVE-2024-27980 fix, so
  `adb.cmd` and npm shims fail with EINVAL. The honest fix, and the error message, is
  `command: "cmd", args: ["/c", "adb", …]`.
- stdout sink: `createWriteStream` + `pipeline(child.stdout, sink)`. This is the one place that must
  use `node:fs` instead of `vscode.workspace.fs`, because the VS Code FS API has no streaming write
  and the alternative is buffering a whole recording in the host. Piping gives free backpressure.
  Write that reason in the file. (The eslint node-builtin ban is scoped to `src/domains/webview/**`,
  and the host build is `platform: 'node'`, so no esbuild change.)
- Guards: one `setTimeout` deadline, one 1 s `setInterval` asking the sink for bytes. The decision
  is a pure `shouldStop(bytes, elapsedMs, limits): CaptureStopReason | null` so it tests without a
  process. A capture that trips a limit **keeps what it wrote** and says so.

### Stopping

1. Mark stopping, so `'close'` reports the real reason. 2. Run the `stopWith` strategy.
3. Race close against a ~5 s grace. 4. Hard kill. 5. Race ~2 s, else report an orphan with its pid.

- **ffmpeg finalises on SIGINT**, or on `q` on stdin. This is why `stopWith` exists at all: getting
  it wrong means a truncated file and the user blames the viewer.
- **Windows has no POSIX signals.** `child.kill('SIGINT')` there ignores the name and calls
  `TerminateProcess` — the child dies without finalising, and there is no way to send a real Ctrl+C
  from Node without a native addon. **On Windows the graceful stop is `stdin-q` and nothing else**,
  which is what the Windows presets set. Hard kill needs `taskkill /pid <pid> /t /f` for the tree.
- `detached: false` keeps the child in the host's process group, so killing it does not reach *its*
  children. `detached: true` + `process.kill(-pid)` would fix POSIX tree kills and is **rejected**:
  a detached group we then fail to kill outlives the extension host entirely, which is worse.

### The size reality — say this out loud

1080p RGBA is **8.3 MB per frame**, so a 256 MB cap is ~30 frames, and 30 s at 30 fps would be
**7.4 GB**. Recording full-resolution RGBA is not practical past a couple of seconds. It *is*
practical for small panels, embedded displays, and anything the tool downsamples. Put that in the
setting description instead of letting people discover it by filling a disk.

## Opening the result

`opener.openSingle([uri])` → `vscode.openWith` → `RawEditorProvider` builds a fresh
`ContentViewSession`. Zero new machinery, and each grab is its own tab — which is what you want when
comparing two grabs. This also sidesteps the biggest structural blocker: `ContentViewSession.sources`
is `readonly` with an `idIndex` built in the constructor, and there is no `sources:add` message, so
**a live view cannot gain a source.**

Two traps:

- **Name every capture uniquely** (`capture-20261031-142233-001.raw`). Re-opening the *same* uri in
  a custom editor reveals the existing tab **without re-creating the webview**, so stale pixels stay
  on screen and the feature looks broken. Reusing one filename to avoid tab sprawl is the obvious
  optimisation and it is wrong.
- **Use `.raw`**, which `contributes.customEditors` already binds at `priority: default`, so the
  file also opens correctly on a double-click in the explorer.

Storage is `context.storageUri ?? context.globalStorageUri` (the former is `undefined` with no
folder open) plus `capture/`, created with `fs.createDirectory`. It is outside the workspace, so it
pollutes no repo and trips no file watcher. Sweep to the newest ~20.

## Affordances

- **One-shot: `withProgress` at `ProgressLocation.Window`.** No `CancellationToken` — a grab is
  0.5–2 s, `cancellable` is *ignored* at `Window` location anyway, and the deadline covers a hang.
- **Recording: a `StatusBarItem`** (`$(debug-stop) Capturing 00:07 · 24.1 MB`, click to stop), with
  a `ContextKeys.Capturing` key so the palette offers Start or Stop but never both — reusing
  `ContextKeyController` exactly as `fieldFocus` does. A notification living for a minute is noise,
  and its Cancel button would become the *only* stop route, forcing every other entry point to
  reach into a token.
- **Not a webview toolbar button.** `docs/overview/messaging.md` states the test: *"can the view
  observe the trigger itself?"* Capture is the inverse — the view cannot observe it, cannot perform
  it, and cannot show the result. It also re-raises the question that got the old `exportPng`
  *command* deleted: **which view?** A button in one view's frame starting a machine-wide capture
  whose output opens elsewhere is a confusing button. Cost if wanted anyway: two new
  `WebviewMessage` types, two in `HostBoundMessageType` (both `Required`, so two resolver maps break
  until answered), a `capture:state` broadcast, a store field, a `viewers` getter on
  `ViewerRegistry` (only `activeViewer` exists, and all open views must agree or their buttons lie),
  and a constructor parameter threaded through `WebviewHost` → `RawEditorProvider` →
  `ViewerWindowController`. Also `ToolbarControl.label` is a fixed string, so ship **two** buttons
  and hide one via `resolveAvailability` rather than changing the contract.

## Saving a capture

A command plus a button on the completion notification — mirroring `ImageExporter`'s existing
"Saved … [Open]" pattern. Not a toolbar button: the last run's uri is host-side state the webview
does not have, and a second save button beside *Export PNG* reads as a duplicate when it in fact
saves raw bytes.

**A folder, not a filepath.** A configured filepath silently overwrites every previous grab and lets
a bad value aim at a file that matters; a folder cannot do either, and a timestamped name beats
anything retyped each time. Empty ⇒ `showSaveDialog`; set ⇒ write straight through with
`workspace.fs.copy(..., { overwrite: false })`, falling back to the dialog on the
practically-impossible collision. Cancel is success-with-nothing, not an error. Relative paths
resolve against the first workspace folder; **no `~` expansion** in v1.

## Presets

Mirror `PixelFormatPresets`: a definitions array plus a static accessor. No builder step (a preset
*is* its definition) and no `FormatRegistry` analogue — nothing needs to register one at runtime.
Applying a preset writes `command`/`args`/`output`/`stopWith` to `ConfigurationTarget.Global`, which
is the **only** valid target for a machine-scoped key — `update(…, Workspace)` throws, so the
security model enforces itself.

**A preset cannot carry decode options.** `vscode.openWith` goes through VS Code, which calls
`RawEditorProvider.resolveCustomEditor` itself, so there is no argument channel into the view that
opens. Every workaround is a hidden host-side map keyed by uri, and a per-buffer options memento was
already tried and removed from this project once. So a preset **documents** its geometry in a
`detail` string ("1920×1080, BGRA8888, Header none") and the user sets the toolbar once.

Confidence marked honestly, because shipping guessed flags as defaults is worse than shipping none:

| Preset | Confidence |
| --- | --- |
| **Linux fbdev** — `cat /dev/fb0`, stdout | **High.** A file read, no header. Geometry from `fbset -i` or `/sys/class/graphics/fb0/{virtual_size,stride,bits_per_pixel}`, mapping onto Width / Stride / Format directly. Needs `video` group; many modern systems are DRM-only with no `/dev/fb0`. |
| **Self-test** — `head -c 65536 /dev/urandom` | **High.** Noise, not an image, but it proves the pipe, sink, byte count and open path with no hardware. |
| **Android** — `adb exec-out screencap`, stdout | **Medium.** `exec-out` being binary-clean is solid. Header is width,height as LE uint32 at bytes 0–7 then a format uint32 — so `headerPreset: u32le` reads w/h and `offset: 4` absorbs the rest. **Newer Android adds a fourth field ⇒ `offset: 8`**; the field's existence is certain, the API level it arrived at is not. `detail` must say: if it shears, switch Offset between 4 and 8. |
| **Linux X11** / **Windows gdigrab** — ffmpeg | **Medium.** Standard invocations, not run here. `-video_size` must match the real screen. |
| **macOS** — ffmpeg avfoundation | **Low, needs validation.** `screencapture` cannot emit raw at all (PNG/TIFF/BMP only), so ffmpeg is the only path. The **screen device index is not stable** and must be found with `-list_devices true`; `-pix_fmt bgra` there is unconfirmed; and the host process needs Screen Recording permission we cannot grant. Ship with the index as an obvious placeholder. |
| **Wayland** | **Does not ship.** `x11grab` does not work, `kmsgrab` needs root, `grim` emits PPM whose ASCII header `HeaderPreset` cannot parse. A stated gap, not a guess. |
| **Windows DXGI** (`ddagrab`) | **Does not ship** until someone runs the filtergraph. |

**Android recording is not available this way:** repeated `screencap` re-emits its header per grab
so it is not a uniform stream, and `screenrecord` emits H.264/MP4. Say so rather than shipping a
preset that produces an unviewable file.

## Prerequisite

**Restore the `FileValidator.isValidFileSize` guard in `SourcesDecoder.openSource`** — commented out
as TEMPORARY for the 1 GiB sample, leaving `FileValidator` with zero live callers. Nothing currently
stops a multi-GiB read, and `BufferItem.fromFileSource` re-reads the whole file on **every** decode
*and every pixel probe*. Capture can trivially produce such a file, so this must land with recording
(and with `capabilities`). Capture should also refuse to auto-open anything above `maxFileSizeMB`,
revealing it in the explorer instead.

## Phases

**0 — manifest and settings, no behaviour.** The seven properties, `capabilities`, the enums file,
`ViewerConfigSchema`, `CONFIG_VALIDATORS`, `asStringArray`, `ConfigReader`.
*Verify:* typecheck goes red at the two total maps and green as they are filled — the contract
working. Unit-test `asStringArray` (non-array, array with a number, and that it copies).

**1 — one-shot grab.** Settings reader, argv substitution, storage, the process with both sinks and
the deadline, `captureFrame`, `withProgress`, open via `openSingle`.
*Unit:* substitution (multiple occurrences in one element, zero occurrences, a path containing `$`);
the `output: file` without `${output}` refusal; name generation with an injected clock; the trust
gate both ways; the ENOENT message.
*Integration, cheap and real:* use **Node as the capture tool** — `command: process.execPath`,
`args: ['-e', 'process.stdout.write(Buffer.alloc(64))']`. Hermetic, cross-platform, no
`child_process` mock, and it covers the real spawn, the stdout→file sink, the byte count, the exit
code and the `'close'`-ordering guarantee.
*By hand:* PATH in a GUI-launched VS Code; the editor actually decoding; any real preset.

**2 — start/stop.** The stop ladder, the tick, `shouldStop`, `maxOutputMB`, the status bar item,
`ContextKeys.Capturing`, the sweep, **and the `FileValidator` guard**.
*Unit:* `shouldStop` exhaustively, including both limits at once (the reported reason's precedence
matters); the stop strategies as a table test asserting each touches only its own channel.
*Integration:* a Node child that traps SIGINT and refuses to die exercises the whole ladder
including hard-kill escalation — POSIX only, with the skip reason stated.
*By hand:* a real ffmpeg stop that still decodes; Windows `taskkill` and `stdin-q`; a deliberate
runaway proving the partial file still opens.
**Blocking dependency:** `TOOLBAR_CONTROLS` has **no `frame` control**, so a multi-frame recording
is unviewable past frame 0. It is a one-entry addition emitting `decodeOptionsUpdate({ frame })`,
and it needs **no upper bound** because `PixelLocator` already clamps to `[0, frameCount - 1]`.
Land it with Phase 2 or ship one-shot only.

**3 — save.** `saveCopy`, the command, the notification action. *Unit:* destination resolution
(folder set / empty / relative), cancel-is-not-an-error, the collision fallback.

**4 — presets.** The table, a QuickPick, a `write` on the config controller. *Unit:* platform
filtering, and that every shipped preset has a non-empty `detail` and a valid `output`/`args`
combination — the same invariant the settings reader enforces, asserted over the table so a bad
preset cannot be committed.

### The highest-value test

A new `capture/manifest.test.ts`, reading `package.json` the way `table.test.ts` does:

- every `rawImageViewer.capture.*` property declares `scope: "machine"`;
- `command`, `args`, `saveFolder` appear in `restrictedConfigurations`;
- `untrustedWorkspaces.supported === 'limited'`;
- every capture command's palette entry's `when` contains `isWorkspaceTrusted`;
- no capture key is in `VIEWER_CONFIG_KEYS.all`.

None of that is visible to `tsc`, all of it rots silently, and it is the security property — it
belongs in a test rather than in a reviewer's memory.

## Open question to verify before Phase 4

Whether machine-scoped settings are excluded from Settings Sync. If they are **synced**, a
`capture.command` changed on one machine arrives silently on another, and a one-time
"Run `…`? [Allow once / Always]" confirmation earns its keep. Also verify the
`workbench.trust.manage` command id before putting it on a notification button, or omit the button.

## Explicitly out of scope

- **Live preview streaming** frames into the canvas. Reuses the streaming work that just landed, but
  needs a live producer behind the decode stream, back-pressure and a frame-drop policy.
- **Re-capturing into an open view.** Needs `ContentViewSession` mutability, a `view:select`
  message, and — the hard part — a way to tell `ImagesSlice` *these bytes changed*, which it has no
  input for (only *these options changed*). A feature of its own.
- **In-memory captures.** `BufferItem.fromFileSource` is hard-wired to `workspace.fs.readFile`, and
  every decode and probe re-reads. Needs a byte-provider seam; the unused `BufferItemRegistry` is
  that seam if it is ever wanted.
- **Per-source decode defaults**, which is what would let a preset carry geometry. Shares its
  missing piece with frame navigation.
- **Custom header presets** (`improvements.md`), which would let a capture self-describe rather than
  leaning on `u32le` + `offset`.
