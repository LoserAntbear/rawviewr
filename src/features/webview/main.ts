import { WebviewCommandDispatcher } from './commands/webViewCommandDispatcher';
import { WebviewSession } from './session/WebviewSession';
import { WebviewSessionCommunicationBridge } from './session/WebviewSessionCommunicationBridge';
import { WEBVIEW_COMMAND_RESOLVERS } from './commands/definitions';
import { RIVImage, RIVMainView, RIVToolbar, RIVAppComponent } from './ui/webcomponents';
import { WebviewHostMessageDispatcher } from './webviewHost/messageDispatcher/WebviewHostMessageDispatcher';
import { WEBVIEW_HOST_MESSAGE_RESOLVERS } from './webviewHost/definitions';

const CUSTOM_COMPONENTS = [
  RIVImage,
  RIVToolbar,
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
  const bridge = new WebviewSessionCommunicationBridge();
  const commandDispatcher = new WebviewCommandDispatcher(
    WEBVIEW_COMMAND_RESOLVERS(bridge),
  );
  const hostMessageDispatcher = new WebviewHostMessageDispatcher(
    WEBVIEW_HOST_MESSAGE_RESOLVERS(),
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
