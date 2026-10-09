import { toStylePropertyList, type StylePropertyGroups } from '@features/webview/utils/styleProperties';

import type { StatusBarEntry } from '../types';

export enum SlotLifecycleMode {
  LiveUpdate = 'liveUpdate',
}

const SEGMENT_STYLE_PROPERTY_GROUPS: StylePropertyGroups<StatusBarEntry | null> = {
  sample: [
    { name: '--sample-color', resolve: (entry) => entry?.sample ?? null },
  ],
};

export const SEGMENT_STYLE_PROPERTIES = toStylePropertyList(SEGMENT_STYLE_PROPERTY_GROUPS);
