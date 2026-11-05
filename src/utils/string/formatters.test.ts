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

describe('StringFormat.kebab', () => {
  it.each([
    ['colorTarget', 'color-target'],
    ['ColorTarget', 'color-target'],
    ['parseHTMLString', 'parse-html-string'],
    ['main color_target.v2', 'main-color-target-v2'],
    ['  --Main  (RGBA8)--  ', 'main-rgba8'],
    ['rgba8', 'rgba8'],
    ['ÜberTarget straße', 'über-target-straße'],
    ['', ''],
    ['-:.', ''],
  ])('"%s" reads "%s"', (input, text) => {
    expect(StringFormat.kebab(input)).toBe(text);
  });

  it('upper-cases every word when asked', () => {
    expect(StringFormat.kebab('colorTarget rgba8', 'upper')).toBe('COLOR-TARGET-RGBA8');
  });

  it('keeps an ISO timestamp in one piece per field', () => {
    // A digit before a capital is not a word boundary, so the `T` stays glued to its neighbours.
    expect(StringFormat.kebab('2026-01-02T03:04:05.006', 'upper')).toBe('2026-01-02T03-04-05-006');
    expect(StringFormat.kebab('2026-01-02T03:04:05.006')).toBe('2026-01-02t03-04-05-006');
  });
});
