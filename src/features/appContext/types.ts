import { VSCodeWorkspaceConfigurationController } from '@features/settings/VSCodeWorkspaceConfig/VScodeWorkspaceConfigurationController';

export interface AppContext {
  readonly workspaceConfig: VSCodeWorkspaceConfigurationController;
}
