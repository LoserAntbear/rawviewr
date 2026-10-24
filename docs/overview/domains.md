# Domains

Three domains under `src/domains`, each with its own `features/`:

| domain | alias | owns |
| --- | --- | --- |
| `extension` | `@EXTENSION` | the file system, the workbench, and every view it opens |
| `webview` | `@WEBVIEW` | the DOM, the store, and what is on screen |
| `shared` | `@SHARED` | what both processes speak |

## The rule

**`shared` imports neither side. `webview` never imports `extension`. `extension` never imports
`webview`.** Enforced in `eslint.config.mjs`, not left to habit — each direction has its own
`no-restricted-imports` rule with a message saying what to do instead.

It is worth enforcing because the failure is quiet. A *value* import of host code from the
webview puts `vscode` in the webview bundle and the build fails loudly — but a `import type`
crossing compiles, bundles, ships, and only becomes a problem when someone later needs the value.
Before the rules existed, ten such crossings had accumulated, all reaching shared types *through*
the extension's `viewer` barrel — which also exports the registry and the window controller.

## What `shared` holds, and why each thing is there

- **`messaging/`** — the generic dispatcher both channels are built on, and `protocol.ts`: the two
  message unions that cross the process boundary. The protocol is owned by neither side, which is
  the whole point; see [messaging.md](./messaging.md).
- **`viewer/`** — the vocabulary both sides speak: `FileSource`, `ContentViewMode`,
  `ViewerBackground`. The host creates these; the view renders them.
- **`image/`** — pure pixel maths: formats, the decoder core, the locator, the probe. Neither
  process owns arithmetic, and both need it — the view reads formats at runtime for the toolbar,
  the host decodes with the same tables.
- **`settings/`** — the configuration contract and the toolbar snapshot, both of which travel in
  messages.
- **`disposable/`**, **`zoom/`** — small contracts used on both sides.

What is *not* shared: anything that reads a file, opens an editor, touches the workbench, or
touches the DOM.

## Three knots this untied

**`webviewHost/` was three domains in one directory.** Its `types.ts` was the wire protocol (the
webview imported it thirteen times), `messageDispatcher/` was webview-side code, and the rest was
the host's half. The eslint exceptions we kept carving — first file by file, then by folder — were
working around exactly that. They are gone: the host's half is
`@EXTENSION/features/webviewHost`, the webview's is `@WEBVIEW/features/hostMessages`, and the
protocol is `@SHARED/features/messaging/protocol`.

**`messaging` was shared infrastructure with a webview-shaped hole in it.** `MessageDispatcher`
serves both channels, but the module also declared `WebviewResolverContext`, which needs the
store. Worse, the generic contracts *defaulted* to it — a shared type whose default reached into
one side. That default is why a channel's posted union and its received union could be conflated
(see *The direction trap* in messaging.md). The context now lives in
`@WEBVIEW/features/messaging`; the contracts default to the bridge-only `ResolverContext`.

**`getNonce` lived in the webview and was used only by the host.** It writes the CSP nonce into
the shell, so it now sits beside the shell that writes it.

## Things to know

- `@definitions`, `@utils`, `@guards`, `@extensions`, `@root` stay outside the domains. They are
  cross-cutting, not features of a side.
- **tsc cannot see a broken `.css` or `.html` import.** `declare module '*.css'` makes any such
  path typecheck whether the file exists or not, so only the bundler catches it. One moved asset
  import passed typecheck and tests and failed the build.
- `viewer/types.ts` and `settings/configuration/types.ts` both export a type called
  `ViewerConfiguration`, with different shapes. The protocol uses the manifest-derived one. Worth
  resolving; not resolved here.
