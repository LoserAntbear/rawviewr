import * as vscode from 'vscode';

import { InfoMessageController } from '@features/infoMessage/InfoMessageController';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

function asBytes(payload: unknown): Uint8Array | null {
  if (payload instanceof ArrayBuffer) {
    return new Uint8Array(payload);
  }

  if (ArrayBuffer.isView(payload)) {
    return new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength);
  }

  return null;
}

function describe(payload: unknown): string {
  return payload === null ? 'null' : `${typeof payload} (${payload?.constructor?.name ?? 'no constructor'})`;
}

export class ImageExporter {
  public async savePng(
    source: vscode.Uri | undefined,
    name: string,
    data: ArrayBuffer,
  ): Promise<void> {
    try {
      const bytes = this.verifyPng(data);
      const target = await this.getTargetUri(source, name);

      if (!target) {
        throw new Error('unable to get target URI to save the image');
      }

      await vscode.workspace.fs.writeFile(target, bytes);
      await this.promptOpenMessage(target);
    } catch (error) {
      InfoMessageController.showError(`Failed to save image: ${error}`);
    }
  }

  private verifyPng(data: ArrayBuffer): Uint8Array {
    const bytes = asBytes(data);

    if (!bytes) {
      throw new Error(
        `the webview's PNG data did not arrive as binary — got ${describe(data)}. `
        + 'The export message must carry an ArrayBuffer.',
      );
    }

    if (bytes.byteLength === 0) {
      throw new Error('the webview sent an empty buffer');
    }

    if (PNG_SIGNATURE.some((byte, index) => bytes[index] !== byte)) {
      throw new Error('the received bytes are not a PNG');
    }

    return bytes;
  }

  private async getTargetUri(
    source: vscode.Uri | undefined,
    name: string,
  ): Promise<vscode.Uri | undefined> {
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
