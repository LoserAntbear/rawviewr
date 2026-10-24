import { OPAQUE_VALUE, RowChannel } from '../definitions';

/**
 * YUV to RGB, BT.601 with studio swing
 * Seems like the most common variant found
 */
export function writeYuvPixel(
  row: Uint8ClampedArray,
  at: number,
  y: number,
  u: number,
  v: number,
): void {
  const luma = 298 * (y - 16);
  const blueChroma = u - 128;
  const redChroma = v - 128;

  row[at + RowChannel.Red] = (luma + 409 * redChroma + 128) >> 8;
  row[at + RowChannel.Green] = (luma - 100 * blueChroma - 208 * redChroma + 128) >> 8;
  row[at + RowChannel.Blue] = (luma + 516 * blueChroma + 128) >> 8;
  row[at + RowChannel.Alpha] = OPAQUE_VALUE;
}
