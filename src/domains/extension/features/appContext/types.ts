import type { VSCodeWorkspaceConfigurationController } from '@EXTENSION/features/settings/VSCodeWorkspaceConfig/VScodeWorkspaceConfigurationController';

export type AppContext = {
  readonly workspaceConfig: VSCodeWorkspaceConfigurationController;
}
