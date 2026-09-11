import type {
  ControlElement,
  ToolbarControl,
  InputDescriptor,
  ExtractDescriptor,
  SupportedInputType,
  SupportedControlTag,
  ControlTagDescriptor,
} from './types';

type ElementBuilderFor<K extends SupportedControlTag> = (
  descriptor: ExtractDescriptor<ControlTagDescriptor, 'tag', K>,
) => HTMLElementTagNameMap[K];
// Exhaustive over the supported tags: adding one is a compile error until it builds.
type ElementBuilderMap = { readonly [K in SupportedControlTag]: ElementBuilderFor<K> };

type InputBuilderFor<T extends SupportedInputType> = (
  descriptor: ExtractDescriptor<InputDescriptor, 'type', T>,
) => HTMLInputElement;
// The same exhaustiveness one level down: a new input type must bring its builder.
type InputBuilderMap = { readonly [T in SupportedInputType]: InputBuilderFor<T> };

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
