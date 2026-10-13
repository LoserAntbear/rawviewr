import type { VSCodeWorkspaceConfigurationController } from '@features/settings/VSCodeWorkspaceConfig/VScodeWorkspaceConfigurationController';

export type AppContext = {
  readonly workspaceConfig: VSCodeWorkspaceConfigurationController;
}
