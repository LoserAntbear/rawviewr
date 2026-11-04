import type { ConfigReader } from '@SHARED/features/settings/configuration/types';

export type AppContext = {
  readonly workspaceConfig: ConfigReader;
}
