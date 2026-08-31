import * as vscode from 'vscode';

import { FileSource } from '../webview/types';
import type { BufferBuildPayload, BufferItemData } from './types';

export class BufferItem implements BufferItemData {
  public static stubFromFileSource(source: FileSource): BufferItem {
    return new BufferItem({
      id: source.id,
      name: source.name,
      detail: source.detail,
      data: new ArrayBuffer(0), // Empty data for stub
    });
  }

  public static async fromFileSource(source: FileSource): Promise<BufferItem> {
    try {
      const bytes = await vscode.workspace.fs.readFile(source.uri);

      return new BufferItem({
        id: source.id,
        name: source.name,
        detail: source.detail,
        data: bytes.slice().buffer,
      });
    } catch (error) {
      console.error(`Failed to read file for BufferItem (id: ${source.id}, name: ${source.name}):`, error);
      // Rethrow to the caller
      throw new Error(`Failed to read file for BufferItem (id: ${source.id}, name: ${source.name}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public readonly id: string;
  public readonly name: string;
  public readonly data: ArrayBuffer;

  public readonly error?: string;
  public readonly detail?: string;
  public readonly base64?: string;

  constructor(payload: BufferBuildPayload) {
    this.id = payload.id;
    this.name = payload.name;
    this.data = payload.data;
    this.detail = payload.detail;
    this.base64 = payload.base64;
  }
}
