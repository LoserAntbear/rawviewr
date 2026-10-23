export enum ContextKeys {
  // Indicates whether a form control inside the raw image viewer has focus.
  // Used to toggle keybindings mode. (To avoid input conflicts when a form control has focus.)
  FieldFocus = 'fieldFocus',
}

export const EXTENSION_CONTEXT_PREFIX = 'rawviewr' as const;
