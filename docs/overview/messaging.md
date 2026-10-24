# Messaging

Two processes, four channels, two message unions pointing opposite ways. Most of what goes
wrong here goes wrong because a direction got mixed up, so this is written direction-first.

## The two unions

| union | direction | examples |
| --- | --- | --- |
| `WebviewMessage` | arrives at the host | `app:ready`, `probe:request`, `export:png` |
| `WebviewHostMessage` | arrives at the view | `session:start`, `images:decode:ready`, `view:zoom` |

They are not symmetrical and they are not interchangeable. The pair of names that matters when
reading a resolver table is **what arrives** versus **what the context's bridge posts** — a
channel receives one union and answers in the other. Tying those two together in the types is
what left every host resolver's payload inferred as `never` once (see *The direction trap*).

`WebviewMessage` carries one more complication: it is two things wearing one name. Some of its
members are commands the view raises on its own DOM and resolves itself; only the rest are ever
posted. `HostBoundMessageType` names the half that crosses, which is what lets the host's
resolver table be `Required` over it.

## The four channels

```
                    ┌─────────────────────── extension host ───────────────────────┐
  keystroke ──► workbench command ──► intent ──► WebviewHost.postToWebview(message)
                                                              │
                                            HostMessageBridge.post
                                                              │
  ┌──────────────────────────────────── webview ──────────────┼────────────────────┐
  │                                                            ▼                    │
  │  window 'message' ──► WebviewSessionCommunicationBridge.listen                  │
  │                        └─► subscribeResolvers(WEBVIEW_HOST_MESSAGE_RESOLVERS)   │
  │                                                                                 │
  │  click / wheel / toolbar ──► riv:command event                                  │
  │                        └─► WebviewCommandDispatcher(WEBVIEW_COMMAND_RESOLVERS)  │
  │                               ├─► the store, and stop             (most of them)│
  │                               └─► bridge.post(…) ─────────────┐                 │
  │                                                                │                │
  │  store bus ──► forwardFrom(STORE_EVENT_FORWARDS) ─────────────┤                 │
  └────────────────────────────────────────────────────────────────┼────────────────┘
                                                                   ▼
                      HostMessageBridge.listen ──► HostMessageDispatcher
                                                   └─► WEBVIEW_MESSAGE_RESOLVERS
```

1. **`riv:command` — inside the view.** A component raises a `CustomEvent` that crosses its
   shadow boundaries. `WEBVIEW_COMMAND_RESOLVERS` answers it, usually by writing to the store
   and stopping there. Zoom, backdrop and decode-option changes never leave the frame.
2. **view → host.** The same table posts over the bridge for the things only the host can do:
   read a file, save a file, open an editor.
3. **store bus → host.** `STORE_EVENT_FORWARDS` turns a slice event into a message, so a slice
   can ask for something without knowing a bridge exists. This is what the decode window uses.
4. **host → view.** `WebviewHost.postToWebview`, and the settings subscriptions beside it.

## Why the host can push into a view at all

This is the one worth writing down, because the method looks redundant and keeps inviting
deletion. It exists for **one thing the view cannot hear for itself: a keystroke.**

VS Code gives an extension no raw-key API. `contributes.keybindings` → a registered command is
the only keyboard entry point there is, so `=` arrives in the extension host as
`rawImageViewer.zoomIn`, in a process that holds no pixels and owns no zoom. The only way from
there into the view is a message. Hence: command → intent → `activeViewer` → `postToWebview`.

Everything the view *can* observe it keeps: a click, a wheel notch, a toolbar change all resolve
on the webview side against its own store. The host push is not the general way in — it is the
exception for input the frame never receives as input.

Two consequences that look unrelated until you know this:

- **`ViewerRegistry.activeViewer` exists for this.** A command fires once for the window, not
  once per view, so something has to decide which view it meant. Zoom is its last caller.
- **`fieldFocus` exists for this.** The keystroke is *also* delivered to the view: VS Code's
  webview preamble ends `handleInnerKeydown` with an unconditional
  `forwardKeyEvent('did-keydown', e)`, so a bare `0` would reset the zoom **and** type a zero
  into the Width field. The view reports whether a form control has focus, the host sets a
  context key, and the manifest's `when` clauses stand the chords down. That round trip is the
  price of the keystroke arriving twice.

The same unconditional forwarding is why the view cannot simply take the chords over: handling
`=` locally would not stop the workbench dispatching the command, and zoom would fire twice.
It is one owner or the other.

### What this is not for

Export used to come through here too — a palette command that looked up the focused view and
posted an `export` message at it, landing in the same `exportSelected` the toolbar button
reaches directly. The button raises `export:request` *inside* the view that holds the pixels, so
the round trip answered a question — *which view?* — that the button never has to ask. The
command, the intent, the resolver and the message were all removed. Export is toolbar-only.

The test for whether something belongs on this channel: **can the view observe the trigger
itself?** If yes, it resolves it locally and the host never hears about it.

## The direction trap

`MessageResolver`'s context is deliberately *not* constrained to match the message it receives,
because on a directional channel the posted union differs from the received one. Constraining
them together compiles perfectly and quietly resolves every payload to `never` — resolvers then
destructure fields that do not exist, with no error, and the only symptom is a hand-written
interface appearing somewhere to replace the type that stopped working.

If a resolver's `message` parameter ever stops being checked, this is the first place to look.
A one-line probe settles it: destructure a field that cannot exist and see whether `tsc` cares.
