import { RIVAppComponent } from './ui/webcomponents/raw-app-component';

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

registerCustomComponents();
