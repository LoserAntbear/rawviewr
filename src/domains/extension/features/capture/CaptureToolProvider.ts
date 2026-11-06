import * as vscode from 'vscode';

import type { ConfigReader } from '@SHARED/features/settings/configuration/types';

import type { CaptureTargetResolver } from './CaptureTargetResolver';
import type { CaptureTool } from './CaptureTool';
import { ConfiguredCaptureTool } from './platforms/configured/ConfiguredCaptureTool';
import { MetalCaptureTargetResolver } from './platforms/darwin/MetalCaptureTargetResolver';
import { MetalTraceCaptureTool } from './platforms/darwin/MetalTraceCaptureTool';

export type CaptureTools = Pick<CaptureToolProvider, 'getActiveTool' | 'currentPlatformTargetResolver'>;

/**
 * Only macOS for now. Will add more when have more willpower for it.
 */
const BUILT_IN_TOOLS: Partial<Record<NodeJS.Platform, () => CaptureTool>> = {
  darwin: () => new MetalTraceCaptureTool(),
};
/**
 * Each platform can have their own way of resolving capture targets.
 * E.g. parsing process ids, or some specific tools for that platform can ask for specific params – you get it.
 */
const TARGET_RESOLVERS: Partial<Record<NodeJS.Platform, () => CaptureTargetResolver>> = {
  darwin: () => new MetalCaptureTargetResolver(),
};

/**
 * Provinding each tool per request, rather than pre-instantiating it.
 * This way the user can change the capture command in settings and have it take effect immediately.
 */
export class CaptureToolProvider {
  public get currentPlatformTargetResolver(): CaptureTargetResolver | null {
    return TARGET_RESOLVERS[process.platform]?.() ?? null;
  }

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
      outputType: this.config.read('capture.outputType'),
    });
  }

  private workspaceFolder(): string | null {
    const [folder] = vscode.workspace.workspaceFolders ?? [];

    return folder?.uri.fsPath ?? null;
  }
}
