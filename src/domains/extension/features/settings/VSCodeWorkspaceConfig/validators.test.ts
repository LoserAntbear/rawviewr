import { describe, expect, it } from 'vitest';

import { CaptureFinishSignal, CaptureOutputType } from '@definitions/capture';
import type { ConfigKey } from '@SHARED/features/settings/configuration/types';

import { asStringArray, CONFIG_VALIDATORS } from './validators';

/**
 * A setting arrives as whatever the user typed into their JSON, so every key answers through a
 * validator that either returns a value of the declared type or nothing at all. `asStringArray`
 * is the only one that has to hold a reference rather than a primitive.
 */
describe('asStringArray', () => {
  it('takes an array of strings', () => {
    expect(asStringArray(['-c', 'cat /dev/fb0'])).toEqual(['-c', 'cat /dev/fb0']);
  });

  it('takes an empty array, which is the contributed default', () => {
    expect(asStringArray([])).toEqual([]);
  });

  it.each([
    ['one string instead of a list', '-c cat /dev/fb0'],
    ['a list with a number in it', ['-c', 42]],
    ['a list with a nested list', ['-c', ['cat']]],
    ['an object', { 0: '-c' }],
    ['nothing', undefined],
    ['null', null],
  ])('refuses %s', (_case, raw) => {
    expect(asStringArray(raw)).toBeNull();
  });

  /**
   * The validated value outlives the call, so handing back the caller's array would leave a
   * later write to it reaching into what was already checked.
   */
  it('copies, so the array it returns is not the one it was given', () => {
    const given = ['-c'];
    const validated = asStringArray(given);

    given.push('cat /dev/fb0');

    expect(validated).toEqual(['-c']);
  });
});

describe('the capture validators', () => {
  const validate = <K extends ConfigKey>(key: K, raw: unknown) => CONFIG_VALIDATORS[key](raw);

  it.each([
    ['capture.outputType', CaptureOutputType.File],
    ['capture.stopWith', CaptureFinishSignal.StdinQ],
  ] as const)('%s takes a member of its own enum', (key, member) => {
    expect(validate(key, member)).toBe(member);
  });

  it.each(['capture.outputType', 'capture.stopWith'] as const)('%s refuses a word it does not know', (key) => {
    expect(validate(key, 'sighup')).toBeNull();
  });

  /** Clamped rather than refused, so a number out of range still opens on something usable. */
  it.each([
    ['capture.timeoutSeconds', 0, 1],
    ['capture.timeoutSeconds', 99_999, 3600],
    ['capture.maxOutputMB', 0, 1],
    ['capture.maxOutputMB', 99_999, 4096],
  ] as const)('%s clamps %d to %d', (key, raw, expected) => {
    expect(validate(key, raw)).toBe(expected);
  });

  it.each(['capture.command', 'capture.saveFolder'] as const)('%s takes a string and nothing else', (key) => {
    expect([validate(key, 'ffmpeg'), validate(key, 42)]).toEqual(['ffmpeg', null]);
  });
});
