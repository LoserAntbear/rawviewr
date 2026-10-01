import { WebviewCommandDispatcher } from './commands/webviewCommandDispatcher';
import { FormatRegistry } from '@features/image/format/FormatRegistry';
import { WebviewSession } from './session/WebviewSession';
import { WebviewSessionCommunicationBridge } from './session/WebviewSessionCommunicationBridge';
import { WEBVIEW_COMMAND_RESOLVERS } from './commands/resolvers';
import { RIVImage, RIVMainView, RIVToolbar, RIVGallery, RIVStatusBar, RIVAppComponent } from './ui/webcomponents';
import { WEBVIEW_HOST_MESSAGE_RESOLVERS } from './webviewHost/messageDispatcher';
import { createWebviewStore } from './store/createWebviewStore';
import { WebviewContextProvider } from './webviewContext/WebviewContextProvider';
import { StyleSheets } from './ui/styleSheets';
import shellStyles from './ui/shell.css';
import { PixelFormatPresets } from '@features/image/format/presets';
import { DEFAULT_DECODE_OPTIONS } from '@features/image/imageDecoder/definitions';

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
  ]);
}

// The document's own sheet: everything below `riv-app-component` styles itself inside
// its shadow root, so this only has to give the shell a box to fill.
// TODO: Find a better way to manage the shell's global styles, possibly moving them into the shadow root of the main component.
StyleSheets.adoptStyleSheet(document, shellStyles);

launchSession();
registerCustomComponents();
