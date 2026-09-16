import type { InputDescriptor, ExtractDescriptor, SupportedInputType } from '../types';
import type { SupportedControlTag, ControlTagDescriptor } from '../controls/types';

export type ElementBuilderFor<K extends SupportedControlTag> = (
  descriptor: ExtractDescriptor<ControlTagDescriptor, 'tag', K>,
) => HTMLElementTagNameMap[K];
// Exhaustive over the supported tags: adding one is a compile error until it builds.
export type ElementBuilderMap = { readonly [K in SupportedControlTag]: ElementBuilderFor<K> };

export type InputBuilderFor<T extends SupportedInputType> = (
  descriptor: ExtractDescriptor<InputDescriptor, 'type', T>,
) => HTMLInputElement;
export type InputBuilderMap = { readonly [T in SupportedInputType]: InputBuilderFor<T> };
export type FieldLabeller = (label: string, element: HTMLElement) => HTMLElement;
export type FieldLabellerMap = { readonly [K in SupportedControlTag]: FieldLabeller };
