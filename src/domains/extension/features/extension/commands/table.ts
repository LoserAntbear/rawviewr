import { CommandNames } from '@definitions/commands';

import {
  parseOpen,
  parseOpenFolderGallery,
  parseOpenGallery,
  parseResetSettings,
  parseRevealItem,
  parseZoomIn,
  parseZoomOut,
  parseZoomReset,
} from './parsers';
import type { IntentCommand } from './types';

export const COMMANDS: readonly IntentCommand[] = [
  { name: CommandNames.open, parseToIntent: parseOpen },
  { name: CommandNames.zoomIn, parseToIntent: parseZoomIn },
  { name: CommandNames.zoomOut, parseToIntent: parseZoomOut },
  { name: CommandNames.zoomReset, parseToIntent: parseZoomReset },
  { name: CommandNames.revealItem, parseToIntent: parseRevealItem },
  { name: CommandNames.openGallery, parseToIntent: parseOpenGallery },
  { name: CommandNames.resetSettings, parseToIntent: parseResetSettings },
  { name: CommandNames.openFolderGallery, parseToIntent: parseOpenFolderGallery },
];
