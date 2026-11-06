import * as vscode from 'vscode';

import type { ConfigReader } from '@SHARED/features/settings/configuration/types';

import type { CaptureTool } from './CaptureTool';
import { ConfiguredCaptureTool } from './platforms/configured/ConfiguredCaptureTool';
import { MetalTraceCaptureTool } from './platforms/darwin/MetalTraceCaptureTool';

const BUILT_IN_TOOLS: Partial<Record<NodeJS.Platform, () => CaptureTool>> = {
  darwin: () => new MetalTraceCaptureTool(),
};

/**
 * Provinding each tool per request, rather than pre-instantiating it.
 * This wey the user can change the capture command in settings and have it take effect immediately.
 */
export class CaptureToolProvider {
  private get currentPlatformBuiltInTool(): CaptureTool | null {
    return BUILT_IN_TOOLS[process.platform]?.() ?? null;
  }

  constructor(private readonly config: ConfigReader) {}

  public getActiveTool(): CaptureTool | null {
    const command = this.config.read('capture.command').trim();

    return command.length === 0 ? this.currentPlatformBuiltInTool : new ConfiguredCaptureTool({
      command,
      args: this.config.read('capture.args'),
      workspaceFolder: this.workspaceFolder(),
      listTargets: this.currentPlatformBuiltInTool?.getTargets ?? null,
    });
  }

  private workspaceFolder(): string | null {
    const [folder] = vscode.workspace.workspaceFolders ?? [];

    return folder?.uri.fsPath ?? null;
  }
}
