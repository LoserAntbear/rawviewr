import type { InputDescriptor, ExtractDescriptor, SupportedInputType } from '../types';
import type {
  ControlElement,
  ToolbarControl,
  ToolbarChoiceGroup,
  SupportedControlTag,
} from '../controls/types';
import type {
  InputBuilderMap,
  InputBuilderFor,
  FieldLabellerMap,
  ElementBuilderMap,
  ElementBuilderFor,
} from './types';
import { ToolbarGroup } from '../definitions';

export class ElementBuilder {
  private static readonly builders: ElementBuilderMap = {
    input: ElementBuilder.buildInput,
    button: ElementBuilder.buildButton,
    select: ElementBuilder.buildSelect,
  };

  private static readonly inputBuilders: InputBuilderMap = {
    number: ElementBuilder.buildNumberInput,
    checkbox: ElementBuilder.buildCheckboxInput,
  };

  private static readonly labellers: FieldLabellerMap = {
    input: ElementBuilder.labelBeside,
    select: ElementBuilder.labelBeside,
    button: ElementBuilder.labelWithin,
  };

  public static build(control: ToolbarControl): ControlElement {
    // Have to explicitly type since the union of builders is not directly callable due to contravariance of their parameters.
    const build = ElementBuilder.builders[control.tag.tag] as ElementBuilderFor<SupportedControlTag>;
    const element = build(control.tag);

    element.id = control.id;
    // Propagating to the dataset for easy access from event handlers.
    element.dataset.controlId = control.id;

    return element;
  }

  private static buildButton(): HTMLButtonElement {
    const button = document.createElement('button');

    button.type = 'button';

    return button;
  }


  public static buildControlsGroup(
    groupId: ToolbarGroup,
  ): HTMLElement | null{
    const fieldset = document.createElement('div');

    fieldset.className = 'group';
    fieldset.dataset.group = groupId;

    return fieldset;
  }

  public static buildField(control: ToolbarControl): [HTMLElement, ControlElement] {
    const element = ElementBuilder.build(control);
    const field = ElementBuilder.labellers[control.tag.tag](control.label, element);

    // Everything below is common to every field, whichever way it was labelled.
    field.className = 'field';
    field.dataset.fieldId = control.id;

    if (control.tooltip) {
      field.title = control.tooltip;
    }

    return [field, element];
  }

  private static labelBeside(label: string, element: HTMLElement): HTMLElement {
    const field = document.createElement('label');
    const text = document.createElement('span');

    text.className = 'field-label';
    text.textContent = label;
    field.append(text, element);

    return field;
  }

  private static labelWithin(label: string, element: HTMLElement): HTMLElement {
    const field = document.createElement('div');

    element.textContent = label;
    field.append(element);

    return field;
  }

  private static buildSelect(): HTMLSelectElement {
    return document.createElement('select');
  }

  public static buildSelectChoices(groups: readonly ToolbarChoiceGroup[]): HTMLElement[] {
    const nodes: HTMLElement[] = [];

    for (const { label, choices } of groups) {
      const parent = label ? ElementBuilder.buildOptionGroup(label) : null;

      for (const choice of choices) {
        const option = document.createElement('option');

        option.value = choice.value;
        option.textContent = choice.label;
        
        (parent ?? { append: (node: HTMLElement) => nodes.push(node) }).append(option);
      }

      if (parent) {
        nodes.push(parent);
      }
    }

    return nodes;
  }

  private static buildOptionGroup(label: string): HTMLOptGroupElement {
    const group = document.createElement('optgroup');

    group.label = label;

    return group;
  }

  private static buildInput(descriptor: InputDescriptor): HTMLInputElement {
    const build = ElementBuilder
      .inputBuilders[descriptor.type] as InputBuilderFor<SupportedInputType>;

    return build(descriptor);
  }

  private static buildNumberInput(
    descriptor: ExtractDescriptor<InputDescriptor, 'type', 'number'>,
  ): HTMLInputElement {
    const input = ElementBuilder.createInput('number');

    input.className = 'narrow';

    if (descriptor.min !== undefined) {
      input.min = descriptor.min;
    }

    return input;
  }

  private static buildCheckboxInput(): HTMLInputElement {
    return ElementBuilder.createInput('checkbox');
  }

  private static createInput(type: SupportedInputType): HTMLInputElement {
    const input = document.createElement('input');

    input.type = type;

    return input;
  }

}
