import type { ViewerConfiguration } from '@SHARED/features/settings/configuration/types';

export type ConfigState = ViewerConfiguration & {
  readonly preserveOptionsForAllWindows: boolean;
};
