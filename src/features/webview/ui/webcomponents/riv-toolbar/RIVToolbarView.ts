import { isHTMLElement } from '@features/webview/utils/html';

import { RIVView } from '../RIVView';
import { ToolbarGroup } from './definitions';
import { TOOLBAR_CONTROLS } from './Controls/controls';
import { ElementBuilder } from './ElementBuilder/ElementBuilder';
import type {
  ToolbarState,
  ControlElement,
  ToolbarControl,
  ToolbarAvailability,
} from './types';

type ControlField = {
  readonly field: HTMLLabelElement;
  readonly element: ControlElement;
};

const ORDERED_TOOLBAR_GROUPS: readonly ToolbarGroup[] = [
  ToolbarGroup.Format,
  ToolbarGroup.Geometry,
  ToolbarGroup.Layout,
  ToolbarGroup.Alpha,
  ToolbarGroup.Header,
];

function groupControls(controls: readonly ToolbarControl[]): [ToolbarGroup, ToolbarControl[]][] {
  const groupedControls: [ToolbarGroup, ToolbarControl[]][] = [];

  for (const control of controls) {
    const group = control.group;
    const groupIndex = ORDERED_TOOLBAR_GROUPS.findIndex((g) => g === group);

    // Skip controls that do not belong to any of the ordered toolbar groups.
    if (groupIndex === -1) {
      continue;
    }

    const existingGroup = groupedControls.find(([g]) => g === group);

    if (existingGroup) {
      existingGroup[1].push(control);
    } else {
      groupedControls.push([group, [control]]);
    }
  }

  return groupedControls;
}

export class RIVToolbarView extends RIVView {
  public get rootRef(): EventTarget {
    return this.root;
  }

  private readonly controlFields = new Map<string, ControlField>();

  public build(): void {
    const root = this.ref('toolbar');

    if (!root) {
      throw new Error('riv-toolbar: template is missing #toolbar');
    }

    // Mirrors `replaceChildren`: the map describes the DOM that is there now.
    this.controlFields.clear();

    root.replaceChildren(...this.buildControls());
  }

  private buildControls(): HTMLElement[] {
    const groups = ORDERED_TOOLBAR_GROUPS
      .map((group) => ElementBuilder.buildControlsGroup(group))
      .filter(isHTMLElement);
    const groupedControls = groupControls(TOOLBAR_CONTROLS);

    for (const [group, controls] of groupedControls) {
      const groupElement = groups.find((g) => g?.dataset.group === group);

      if (!groupElement) {
        continue;
      }

      for (const control of controls) {
        const [field, element] = ElementBuilder.buildField(control);

        groupElement.appendChild(field);

        this.controlFields.set(control.id, { field, element });
      }
    }

    return groups;
  }

  public render(state: ToolbarState): void {
    for (const [id, { element }] of this.controlFields) {
      this.write(element, state.values[id] ?? '');
    }

    this.applyAvailability(state.availability);
  }

  private write(element: ControlElement, rawValue: string): void {
    if (element instanceof HTMLInputElement && element.type === 'checkbox') {
      element.checked = rawValue === 'true';

      return;
    }

    // Guarded: assigning an identical value still moves the caret in a number input.
    if (element.value !== rawValue) {
      element.value = rawValue;
    }
  }

  private applyAvailability(availability: ToolbarAvailability): void {
    for (const [id, { field, element }] of this.controlFields) {
      const status = availability[id] ?? {};

      field.hidden = status.hidden ?? false;
      element.disabled = status.disabled ?? false;

      if (element instanceof HTMLInputElement && status.placeholder !== undefined) {
        element.placeholder = status.placeholder;
      }
    }
  }
}
