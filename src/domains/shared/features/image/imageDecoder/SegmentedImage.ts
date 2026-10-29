import type { Vector2 } from '@definitions/geometry';

import type {
  DecodedImage,
  DecodedSegment,
  SegmentedPixel,
} from './types';

export type SegmentedImage = {
  readonly width: number;
  readonly height: number;
  readonly segments: readonly DecodedSegment[];
};

function buildEmptySegmentedImage(width: number, height: number): SegmentedImage {
  return { width, height, segments: [] };
}

function fromDecodedImage({ width, height, data }: DecodedImage): SegmentedImage {
  return { width, height, segments: [{ row: 0, totalRows: height, data }] };
}

// Intentionally recreate the segments array to ensure immutability and trigger change detection.
function withSegment(image: SegmentedImage, segment: DecodedSegment): SegmentedImage {
  return { ...image, segments: [...image.segments, segment] };
}

function segmentAtRow(
  segments: readonly DecodedSegment[],
  y: number,
): DecodedSegment | undefined {
  return segments.find(({ row, totalRows }) => y >= row && y < row + totalRows);
}

function decodedRowCount(segments: readonly DecodedSegment[]): number {
  return segments.reduce((rows, segment) => rows + segment.totalRows, 0);
}

function isFullyDecoded({ height, segments }: SegmentedImage): boolean {
  return decodedRowCount(segments) >= height;
}

// Returning null instead of throwing, since this is a normal part of expected
// workflow when dealing with partially decoded images – it's not an error if a segment hasn't arrived yet.
function locatePixel(image: SegmentedImage, { x, y }: Vector2): SegmentedPixel | null {
  const segment = segmentAtRow(image.segments, y);
  let located: SegmentedPixel | null = null;

  if (segment) {
    located = {
      data: segment.data,
      offset: ((y - segment.row) * image.width + x) * 4,
    };
  }

  return located;
}

export const SegmentedImage = {
  withSegment,
  locatePixel,
  segmentAtRow,
  isFullyDecoded,
  decodedRowCount,
  fromDecodedImage,
  buildEmpty: buildEmptySegmentedImage,
};
