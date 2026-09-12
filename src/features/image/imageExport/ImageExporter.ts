import * as vscode from 'vscode';

export class ImageExporter {
  public async savePng(
    source: vscode.Uri,
    name: string,
    base64: string,
  ): Promise<void> {
    try {
      const target = await this.getTargetUri(source, name);

      if (!target) {
        throw new Error('unable to get target URI to save the image');
      }

      await vscode.workspace.fs.writeFile(target, Buffer.from(base64, 'base64'));
      await this.promptOpenMessage(target);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to save image: ${error}`);
    }
  }

  private async getTargetUri(source: vscode.Uri, name: string): Promise<vscode.Uri | undefined> {
    const defaultUri = source ? vscode.Uri.joinPath(source, '..', name) : undefined;

    return await vscode.window.showSaveDialog({
      defaultUri,
      filters: { 'PNG image': ['png'] },
      title: 'Export decoded image',
    });
  }

  private async promptOpenMessage(target: vscode.Uri): Promise<void> {
    const open = await vscode.window.showInformationMessage(
      `Saved ${vscode.workspace.asRelativePath(target)}`,
      'Open',
    );

    if (open === 'Open') {
      await vscode.commands.executeCommand('vscode.open', target);
    }
  }
}
