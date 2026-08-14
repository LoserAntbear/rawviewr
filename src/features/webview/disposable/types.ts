/**
 * Webview-side counterpart to `vscode.Disposable`.
 *
 * Structurally identical, deliberately NOT imported from `vscode`
 * To avoid cross-bundle imports, which would bloat the webview bundle with VS Code's API.
 * And that's absolutely useless.
 */
export type WebviewDisposable = {
  dispose(): void;
};
