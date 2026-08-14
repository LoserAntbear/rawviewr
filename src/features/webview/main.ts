import { WebViewCommandDispatcher } from './commands/webViewCommandDispatcher';
import { RIVAppComponent } from './ui/webcomponents/riv-app-component';
import { WebviewSession } from './session/WebviewSession';
import { WEBVIEW_SESSION_COMM_BRIDGE } from './session/WebviewSessionCommunicationBridge';
import { WEBVIEW_COMMAND_RESOLVERS } from './commands/definitions';

const CUSTOM_COMPONENTS = [
  RIVAppComponent,
];

function registerCustomComponents(): void {
  for (const component of CUSTOM_COMPONENTS) {
    if (!component.tagName) {
      console.warn(`Cannot register custom component ${component.name} because it does not have a tagName property. Skipping registration.`);
      continue;
    }

    if (customElements.get(component.tagName)) {
      console.warn(`Custom component ${component.tagName} is already registered. Skipping registration.`);
      continue;
    }

    customElements.define(component.tagName, component);
  }
}

function launchSession(): void {
  const bridge = WEBVIEW_SESSION_COMM_BRIDGE;
  const commandDispatcher = new WebViewCommandDispatcher(
    WEBVIEW_COMMAND_RESOLVERS(bridge),
  );

  new WebviewSession(
    commandDispatcher,
    document
  );
}

launchSession();
registerCustomComponents();
