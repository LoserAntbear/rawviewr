import type { CommandNames } from '@definitions/commands';
import type { IntentParser } from '@features/intent/types';

export type IntentCommand = {
  readonly name: CommandNames;
  readonly parseToIntent: IntentParser;
};
