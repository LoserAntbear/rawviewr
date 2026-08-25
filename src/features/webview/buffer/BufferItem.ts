import * as vscode from 'vscode';

import { FileSource } from '../types';
import { BufferBuildPayload } from './types';

export class BufferItem {
  public static stubFromFileSource(source: FileSource): BufferItem {
    return new BufferItem({
      byteLength: 0,
      id: source.id,
      name: source.name,
      detail: source.detail,
    });
  }

  public static async fromFileSource(source: FileSource): Promise<BufferItem> {
    try {
      const bytes = await vscode.workspace.fs.readFile(source.uri);

      return new BufferItem({
        id: source.id,
        name: source.name,
        detail: source.detail,
        byteLength: bytes.byteLength,
        base64: Buffer.from(bytes).toString('base64'),
      });
    } catch (error) {
      console.error(`Failed to read file for BufferItem (id: ${source.id}, name: ${source.name}):`, error);
      // Rethrow to the caller
      throw new Error(`Failed to read file for BufferItem (id: ${source.id}, name: ${source.name}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public readonly id: string;
  public readonly name: string;
  public readonly byteLength: number;

  public readonly error?: string;
  public readonly detail?: string;
  public readonly base64?: string;

  constructor(payload: BufferBuildPayload) {
    this.id = payload.id;
    this.name = payload.name;
    this.detail = payload.detail;
    this.base64 = payload.base64;
    this.byteLength = payload.byteLength ?? 0;
  }
}
