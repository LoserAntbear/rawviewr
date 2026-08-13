import { RIVAppComponent } from './ui/webcomponents/raw-app-component';

const CUSTOM_COMPONENTS = [
  RIVAppComponent,
];

function registerCustomComponents(): void {
  for (const component of CUSTOM_COMPONENTS) {
    customElements.define(component.tagName, component);
  }
}

registerCustomComponents();
