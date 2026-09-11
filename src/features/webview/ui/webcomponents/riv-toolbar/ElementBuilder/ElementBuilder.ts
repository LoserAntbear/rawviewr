import type {
  ControlElement,
  ToolbarControl,
  InputDescriptor,
  ExtractDescriptor,
  SupportedInputType,
  SupportedControlTag,
  ControlTagDescriptor,
} from '../types';
import type {
  InputBuilderMap,
  InputBuilderFor,
  ElementBuilderMap,
  ElementBuilderFor,
} from './types';
import { ToolbarGroup } from '../definitions';

export class ElementBuilder {
    private static readonly builders: ElementBuilderMap = {
    input: ElementBuilder.buildInput,
    select: ElementBuilder.buildSelect,
  };

  private static readonly inputBuilders: InputBuilderMap = {
    number: ElementBuilder.buildNumberInput,
    checkbox: ElementBuilder.buildCheckboxInput,
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

  public static buildControlsGroup(
    groupId: ToolbarGroup,
  ): HTMLElement | null{
    const fieldset = document.createElement('div');

    fieldset.className = 'group';
    fieldset.dataset.group = groupId;

    return fieldset;
  }

  public static buildField(control: ToolbarControl): [HTMLLabelElement, ControlElement] {
    const field = document.createElement('label');
    const element = ElementBuilder.build(control);
    const text = document.createElement('span');

    text.className = 'field-label';
    text.textContent = control.label;

    field.className = 'field';
    field.dataset.field = control.id;
    field.append(text, element);

    if (control.tooltip) {
      field.title = control.tooltip;
    }

    return [field, element];
  }

  private static buildSelect(
    descriptor: ExtractDescriptor<ControlTagDescriptor, 'tag', 'select'>,
  ): HTMLSelectElement {
    const select = document.createElement('select');

    for (const { label, choices } of descriptor.choiceGroups()) {
      const parent = ElementBuilder.buildSelectorGroupParentNode(select, label);

      for (const choice of choices) {
        const option = document.createElement('option');

        option.value = choice.value;
        option.textContent = choice.label;
        parent.append(option);
      }
    }

    return select;
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

  /**
   * <optgrup> for labelled groups
   * nothing if no label given
   */
  private static buildSelectorGroupParentNode(
    select: HTMLSelectElement,
    label: string | undefined,
  ): HTMLSelectElement | HTMLOptGroupElement {
    if (!label) {
      return select;
    }

    const group = document.createElement('optgroup');

    group.label = label;
    select.append(group);

    return group;
  }
}
