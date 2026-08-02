import type { CommandNames } from '../../../definitions/commands';
import { IntentParser } from '../../intent/types';

export type IntentCommand = {
  readonly name: CommandNames;
  readonly parseToIntent: IntentParser;
};
