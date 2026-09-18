import { describe, expect, it } from 'vitest';

import { BYTE_STEP, ByteConverter } from './bits';

const MIB = BYTE_STEP ** 2;

describe('ByteConverter.gradeFor', () => {
  it.each([
    [0, 'B'],
    [1023, 'B'],
    [1024, 'KiB'],
    [MIB - 1, 'KiB'],
    [MIB, 'MiB'],
    [BYTE_STEP ** 5, 'PiB'],
    [BYTE_STEP ** 8, 'YiB'],
  ])('%d bytes is graded %s', (bytes, grade) => {
    expect(ByteConverter.gradeFor(bytes)).toBe(grade);
  });

  it('saturates at the largest grade rather than running off the table', () => {
    expect(ByteConverter.gradeFor(BYTE_STEP ** 20)).toBe('YiB');
  });

  it('grades by magnitude, so a negative size keeps its unit', () => {
    expect(ByteConverter.gradeFor(-2048)).toBe('KiB');
  });
});

describe('ByteConverter.to / from', () => {
  it('uses binary steps, which is why the grades are KiB and MiB rather than KB and MB', () => {
    expect(ByteConverter.from('MiB', 50)).toBe(52_428_800);
    expect(ByteConverter.to('KiB', 2048)).toBe(2);
  });

  it('round-trips', () => {
    expect(ByteConverter.to('MiB', ByteConverter.from('MiB', 7))).toBe(7);
  });
});

describe('ByteConverter: value checks', () => {
  it.each([
    ['to', () => ByteConverter.to('MiB', Number.NaN)],
    ['from', () => ByteConverter.from('MiB', Number.POSITIVE_INFINITY)],
    ['gradeFor', () => ByteConverter.gradeFor(Number.NaN)],
  ])('%s refuses a non-finite number rather than returning NaN', (_label, call) => {
    expect(call).toThrow(/finite/);
  });

  it('refuses an unknown grade', () => {
    expect(() => ByteConverter.to('KB' as never, 1)).toThrow(/Unknown byte grade/);
  });
});
