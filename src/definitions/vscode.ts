export enum VSCodeCommands {
  OpenWith = 'vscode.openWith',
}

/** Document Schemes we are willing to read buffers from. */
export const ALLOWED_DOCUMENT_SCHEMES: ReadonlySet<string> = new Set(['file', 'vscode-remote', 'vscode-vfs']);
