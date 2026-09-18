import { describe, expect, it } from 'vitest';

import { StringFormat } from './formatters';

const KIB = 1024;
const MIB = KIB * KIB;

describe('StringFormat.bytes', () => {
  it.each([
    [0, '0 B'],
    [1023, '1023 B'],
    [1024, '1.0 KiB'],
    [2048, '2.0 KiB'],
    [1_048_000, '1023.4 KiB'],
    [MIB, '1.00 MiB'],
    [5 * MIB, '5.00 MiB'],
    [4 * 1024 ** 3, '4.00 GiB'],
  ])('%d bytes reads "%s"', (bytes, text) => {
    expect(StringFormat.bytes(bytes)).toBe(text);
  });

  it('promotes a value that rounds up to its own grade boundary', () => {
    // 1048575 B is 1023.999 KiB — correctly graded KiB, but "1024.0 KiB" when rounded.
    expect(StringFormat.bytes(MIB - 1)).toBe('1.00 MiB');
    expect(StringFormat.bytes(1024 ** 3 - 1)).toBe('1.00 GiB');
  });

  it('renders a placeholder for a bad count instead of throwing into a caption', () => {
    expect(StringFormat.bytes(Number.NaN)).toBe('-/-');
  });
});
