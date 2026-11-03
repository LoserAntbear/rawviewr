import { isHTMLElement } from '@WEBVIEW/features/utils/html';

import { RIVView } from '../RIVView';

import { TOOLBAR_CONTROLS } from './controls/controls';
import type { ControlElement, ToolbarChoiceGroup, ToolbarControl } from './controls/types';
import { ToolbarGroup } from './definitions';
import { ElementBuilder } from './ElementBuilder/ElementBuilder';
import type { ToolbarAvailability, ToolbarState } from './state/types';

type ControlField = {
  readonly field: HTMLElement;
  readonly element: ControlElement;
};

/** Cheap enough to compute per render, and the only way to know an offer is unchanged. */
function toChoiceSignature(groups: readonly ToolbarChoiceGroup[]): string {
  return groups
    .map(({ label, choices }) => `${label ?? ''}:${choices.map(({ value, label: text }) => `${value}=${text}`).join(',')}`)
    .join('|');
}

type Section = 'options' | 'actions';
const ORDERED_TOOLBAR_GROUPS: Record<Section, readonly ToolbarGroup[]> = {
  options: [
    ToolbarGroup.Format,
    ToolbarGroup.Geometry,
    ToolbarGroup.Layout,
    ToolbarGroup.Alpha,
    ToolbarGroup.Header,
    ToolbarGroup.View,
  ],
  actions: [
    ToolbarGroup.Actions,
  ],
};

function groupControls(
  groups: readonly ToolbarGroup[],
  controls: readonly ToolbarControl[],
): [ToolbarGroup, ToolbarControl[]][] {
  const groupedControls: [ToolbarGroup, ToolbarControl[]][] = [];

  for (const control of controls) {
    const group = control.group;
    const groupIndex = groups.findIndex((g) => g === group);

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
    const actionsGroup = this.ref('toolbar-actions');
    const optionsGroup = this.ref('toolbar-options');

    root.replaceChildren(
      this.assignControls(this.buildControls('options'), optionsGroup),
      this.assignControls(this.buildControls('actions'), actionsGroup),
    );
  }

  private assignControls(controls: HTMLElement[], groupRef: HTMLElement | null): HTMLElement | string {
    for (const control of controls) {
      groupRef?.appendChild(control);
    }

    return groupRef ?? '';
  }

  private buildControls(section: Section): HTMLElement[] {
    const groups = ORDERED_TOOLBAR_GROUPS[section]
      .map((group) => ElementBuilder.buildControlsGroup(group))
      .filter(isHTMLElement);
    const groupedControls = groupControls(ORDERED_TOOLBAR_GROUPS[section], TOOLBAR_CONTROLS);

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
      const value = state.values[id];

      // Before the value: it can only be selected once the option offering it exists.
      this.applyChoices(element, state.choices[id]);

      // Only value controls have an entry; anything else has no value to write.
      if (value !== undefined) {
        this.write(element, value);
      }
    }

    this.applyAvailability(state.availability);
  }

  private applyChoices(element: ControlElement, groups: readonly ToolbarChoiceGroup[] = []): void {
    if (!(element instanceof HTMLSelectElement)) {
      return;
    }

    const signature = toChoiceSignature(groups);

    if (element.dataset.choices === signature) {
      return;
    }

    element.dataset.choices = signature;
    element.replaceChildren(...ElementBuilder.buildSelectChoices(groups));
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
