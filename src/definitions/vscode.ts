export enum VSCodeCommands {
  SetContext = 'setContext',
  OpenWith = 'vscode.openWith',
  RevealFileInOS = 'revealFileInOS',
  RevealInExplorer = 'revealInExplorer',
  OpenSettings = 'workbench.action.openSettings',
}

/** Document Schemes we are willing to read buffers from. */
export const ALLOWED_DOCUMENT_SCHEMES: ReadonlySet<string> = new Set(['file', 'vscode-remote', 'vscode-vfs']);

/**
 * The set of valid targets, which we can read from actions
 * E.g. when we need to pass some data to the extension about which part of the webview was interacted with.
 *
 * This corresponds to the `actionTarget` used in the context for VS Code.
 *
 * We can later use these, for example, as validation for specific commands or context menu actions.
 * SEE: `package.json` `webview/context` entries for how this is used.
 */
export enum VSCodeWebviewContextActionTarget {
  GalleryItem = 'galleryItem',
}
