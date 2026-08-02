import { CommandNames } from '../../../definitions/commands';
import {
  parseExport,
  parseOpen,
  parseOpenFolderGallery,
  parseOpenGallery,
  parseResetSettings,
} from './parsers';
import type { IntentCommand } from './types';

export const COMMANDS: readonly IntentCommand[] = [
  { name: CommandNames.open, parseToIntent: parseOpen },
  { name: CommandNames.exportPng, parseToIntent: parseExport },
  { name: CommandNames.openGallery, parseToIntent: parseOpenGallery },
  { name: CommandNames.resetSettings, parseToIntent: parseResetSettings },
  { name: CommandNames.openFolderGallery, parseToIntent: parseOpenFolderGallery },
];
