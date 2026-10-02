import { CommandNames } from '@definitions/commands';
import {
  parseOpen,
  parseExport,
  parseZoomIn,
  parseZoomOut,
  parseZoomReset,
  parseOpenGallery,
  parseResetSettings,
  parseOpenFolderGallery,
} from './parsers';
import type { IntentCommand } from './types';

export const COMMANDS: readonly IntentCommand[] = [
  { name: CommandNames.open, parseToIntent: parseOpen },
  { name: CommandNames.zoomIn, parseToIntent: parseZoomIn },
  { name: CommandNames.zoomOut, parseToIntent: parseZoomOut },
  { name: CommandNames.exportPng, parseToIntent: parseExport },
  { name: CommandNames.zoomReset, parseToIntent: parseZoomReset },
  { name: CommandNames.openGallery, parseToIntent: parseOpenGallery },
  { name: CommandNames.resetSettings, parseToIntent: parseResetSettings },
  { name: CommandNames.openFolderGallery, parseToIntent: parseOpenFolderGallery },
];
