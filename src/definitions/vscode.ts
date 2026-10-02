export enum VSCodeCommands {
  SetContext = 'setContext',
  OpenWith = 'vscode.openWith',
}

export enum ContextKeys {
  // Indicates whether a form control inside the raw image viewer has focus.
  // Used to toggle keybindings mode. (To avoid input conflicts when a form control has focus.)
  FieldFocus = 'rawImageViewer.fieldFocus',
}

/** Document Schemes we are willing to read buffers from. */
export const ALLOWED_DOCUMENT_SCHEMES: ReadonlySet<string> = new Set(['file', 'vscode-remote', 'vscode-vfs']);
