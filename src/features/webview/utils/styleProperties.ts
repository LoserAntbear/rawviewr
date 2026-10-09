/**
 * A custom property, and where its value comes from.
 *
 * Pass `null` to remove the property from the element.
 */
export type StyleProperty<TState> = {
  readonly name: string;
  readonly resolve: (state: TState) => string | null;
};
export type StylePropertyGroups<TState> = Readonly<Record<string, readonly StyleProperty<TState>[]>>;

export function toStylePropertyList<TState>(
  groups: StylePropertyGroups<TState>,
): readonly StyleProperty<TState>[] {
  return Object.values(groups).flat();
}

export function applyStyleProperties<TState>(
  style: CSSStyleDeclaration,
  properties: readonly StyleProperty<TState>[],
  state: TState,
): void {
  for (const { name, resolve } of properties) {
    const value = resolve(state);

    if (value === null) {
      style.removeProperty(name);

      continue;
    }

    style.setProperty(name, value);
  }
}
