import { WebviewCommandDispatcher } from './commands/webviewCommandDispatcher';
import { FormatRegistry } from '@features/image/format/FormatRegistry';
import { WebviewSession } from './session/WebviewSession';
import { WebviewSessionCommunicationBridge } from './session/WebviewSessionCommunicationBridge';
import { WEBVIEW_COMMAND_RESOLVERS } from './commands/definitions';
import { RIVImage, RIVMainView, RIVToolbar, RIVGallery, RIVAppComponent } from './ui/webcomponents';
import { WebviewHostMessageDispatcher } from './webviewHost/messageDispatcher/WebviewHostMessageDispatcher';
import { WEBVIEW_HOST_MESSAGE_RESOLVERS } from './webviewHost/definitions';
import { createWebviewStore } from './store/createWebviewStore';
import { WebviewContextProvider } from './webviewContext/WebviewContextProvider';
import { StyleSheets } from './ui/styleSheets';
import shellStyles from './ui/shell.css';
import { FORMAT_PRESETS } from '@features/image/format/presets';
import { DEFAULT_DECODE_OPTIONS } from '@features/image/imageDecoder/definitions';

// Order matters: RIVAppComponent mounts the others from its template during its own
// constructor, so they must already be defined by the time it upgrades.
const CUSTOM_COMPONENTS = [
  RIVImage,
  RIVToolbar,
  RIVGallery,
  RIVMainView,
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
  const formatRegistry = new FormatRegistry(FORMAT_PRESETS, DEFAULT_DECODE_OPTIONS.format);
  const { store } = createWebviewStore(formatRegistry);

  WebviewContextProvider.create({ store, formatRegistry });

  const bridge = new WebviewSessionCommunicationBridge();
  const commandDispatcher = new WebviewCommandDispatcher(
    WEBVIEW_COMMAND_RESOLVERS(bridge),
  );
  const hostMessageDispatcher = new WebviewHostMessageDispatcher(
    WEBVIEW_HOST_MESSAGE_RESOLVERS(store),
    bridge,
  );

  new WebviewSession(
    commandDispatcher,
    hostMessageDispatcher,
    document
  );
}

// The document's own sheet: everything below `riv-app-component` styles itself inside
// its shadow root, so this only has to give the shell a box to fill.
// TODO: Find a better way to manage the shell's global styles, possibly moving them into the shadow root of the main component.
StyleSheets.adoptStyleSheet(document, shellStyles);

launchSession();
registerCustomComponents();
