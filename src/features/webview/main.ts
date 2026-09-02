import { WebviewCommandDispatcher } from './commands/webviewCommandDispatcher';
import { WebviewSession } from './session/WebviewSession';
import { WebviewSessionCommunicationBridge } from './session/WebviewSessionCommunicationBridge';
import { WEBVIEW_COMMAND_RESOLVERS } from './commands/definitions';
import { RIVImage, RIVMainView, RIVToolbar, RIVGallery, RIVAppComponent } from './ui/webcomponents';
import { WebviewHostMessageDispatcher } from './webviewHost/messageDispatcher/WebviewHostMessageDispatcher';
import { WEBVIEW_HOST_MESSAGE_RESOLVERS } from './webviewHost/definitions';
import { ReactiveStore } from './store/ReactiveStore';
import { WebviewContextProvider } from './webviewContext/WebviewContextProvider';
import { BufferItemRegistry } from '../buffer';

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
  const store = new ReactiveStore(new BufferItemRegistry());

  WebviewContextProvider.create({ store });

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

launchSession();
registerCustomComponents();
