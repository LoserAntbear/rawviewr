import {
  InputDescriptor,
  ExtractDescriptor,
  SupportedInputType,
  SupportedControlTag,
  ControlTagDescriptor,
 } from '../types';

export type ElementBuilderFor<K extends SupportedControlTag> = (
  descriptor: ExtractDescriptor<ControlTagDescriptor, 'tag', K>,
) => HTMLElementTagNameMap[K];
// Exhaustive over the supported tags: adding one is a compile error until it builds.
export type ElementBuilderMap = { readonly [K in SupportedControlTag]: ElementBuilderFor<K> };

export type InputBuilderFor<T extends SupportedInputType> = (
  descriptor: ExtractDescriptor<InputDescriptor, 'type', T>,
) => HTMLInputElement;
// The same exhaustiveness one level down: a new input type must bring its builder.
export type InputBuilderMap = { readonly [T in SupportedInputType]: InputBuilderFor<T> };
