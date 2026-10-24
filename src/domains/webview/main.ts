import { FormatRegistry } from '@SHARED/features/image/format/FormatRegistry';
import { PixelFormatPresets } from '@SHARED/features/image/format/presets';
import { DEFAULT_DECODE_OPTIONS } from '@SHARED/features/image/imageDecoder/definitions';
import { FieldFocusTracker } from '@WEBVIEW/features/_features/fieldFocus/FieldFocusTracker';
import { WEBVIEW_COMMAND_RESOLVERS } from '@WEBVIEW/features/commands/resolvers';
import { WebviewCommandDispatcher } from '@WEBVIEW/features/commands/webviewCommandDispatcher';
import { STORE_EVENT_FORWARDS, WEBVIEW_HOST_MESSAGE_RESOLVERS } from '@WEBVIEW/features/hostMessages';
import { WebviewSession } from '@WEBVIEW/features/session/WebviewSession';
import { WebviewSessionCommunicationBridge } from '@WEBVIEW/features/session/WebviewSessionCommunicationBridge';
import { createWebviewStore } from '@WEBVIEW/features/store/createWebviewStore';
import shellStyles from '@WEBVIEW/features/ui/shell.css';
import { StyleSheets } from '@WEBVIEW/features/ui/styleSheets';
import { RIVAppComponent, RIVGallery, RIVImage, RIVMainView, RIVStatusBar, RIVToolbar } from '@WEBVIEW/features/ui/webcomponents';
import { WebviewContextProvider } from '@WEBVIEW/features/webviewContext/WebviewContextProvider';

// Order matters: RIVAppComponent mounts the others from its template during its own
// constructor, so they must already be defined by the time it upgrades.
const CUSTOM_COMPONENTS = [
  RIVImage,
  RIVToolbar,
  RIVGallery,
  RIVMainView,
  RIVStatusBar,
  RIVAppComponent,
];

function registerCustomComponents(): void {
  for (const component of CUSTOM_COMPONENTS) {
    if (customElements.get(component.tagName)) {
      console.warn(`Custom component ${component.tagName} is already registered. Skipping registration.`);
      continue;
    }

    customElements.define(component.tagName, component);
  }
}

function launchSession(): void {
  const formatRegistry = new FormatRegistry(PixelFormatPresets.PRESETS, DEFAULT_DECODE_OPTIONS.format.id);
  const { store } = createWebviewStore();

  WebviewContextProvider.create({ store, formatRegistry });

  const bridge = new WebviewSessionCommunicationBridge();
  // Each channel assembles the context its resolvers get: itself, plus what it is handed.
  const commandDispatcher = new WebviewCommandDispatcher(WEBVIEW_COMMAND_RESOLVERS, bridge, { store });

  new WebviewSession([
    commandDispatcher.listen(document),
    // The bridge re-emits what the host sends; the resolvers are subscriptions to it.
    bridge.listen(window),
    bridge.subscribeResolvers(WEBVIEW_HOST_MESSAGE_RESOLVERS, { store }),
    bridge.forwardFrom(store.bus, STORE_EVENT_FORWARDS, { store }),
    // Keyboard shortcuts are resolved outside this frame, which cannot see what has focus.
    new FieldFocusTracker(bridge).watch(window),
  ]);
}

// The document's own sheet: everything below `riv-app-component` styles itself inside
// its shadow root, so this only has to give the shell a box to fill.
// TODO: Find a better way to manage the shell's global styles, possibly moving them into the shadow root of the main component.
StyleSheets.adoptStyleSheet(document, shellStyles);

launchSession();
registerCustomComponents();
