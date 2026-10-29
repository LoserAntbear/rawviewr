import type { Geometry } from '@SHARED/features/image/imageDecoder/imagePreparation';
import { SegmentedImage } from '@SHARED/features/image/imageDecoder/SegmentedImage';
import type { DecodedFileSegment, DecodedFileStart } from '@SHARED/features/image/imageDecoder/types';

// Have to keep types here to make use of joint declaration merging with the exported ImageItem object
// #region TYPES
type DecodedImageResult = {
  readonly id: string;
  readonly name: string;
  readonly runId: string;
  readonly byteLength: number;
  readonly geometry: Geometry;
  readonly detail: string | null;
  readonly image: SegmentedImage;
};

export type StreamingImageItem = DecodedImageResult & {
  readonly kind: 'streaming';
};

export type ReadyImageItem = DecodedImageResult & {
  readonly kind: 'ready';
};

export type ImageItem = { readonly id: string; } & (
  | { readonly kind: 'empty' }
  | { readonly kind: 'pending' }
  | { readonly kind: 'failed'; readonly message: string }
)
  | StreamingImageItem
  | ReadyImageItem;

// #region DECLARATIONS
function isValidStreamingRun(item: ImageItem, runId: string): item is StreamingImageItem {
  return isStreamingImageItem(item) && item.runId === runId;
}

function toStreamingItem(start: DecodedFileStart): StreamingImageItem {
  return {
    kind: 'streaming',

    id: start.id,
    name: start.name,
    runId: start.runId,
    detail: start.detail,
    geometry: start.geometry,
    byteLength: start.byteLength,
    image: SegmentedImage.buildEmpty(start.geometry.width, start.geometry.height),
  };
}

function isReadyImageItem(item?: ImageItem): item is ReadyImageItem {
  return item?.kind === 'ready';
}

function isStreamingImageItem(item?: ImageItem): item is StreamingImageItem {
  return item?.kind === 'streaming';
}

function withAppendedSegment(
  { runId, segment }: DecodedFileSegment,
  item?: ImageItem,
): StreamingImageItem | null {
  let appended: StreamingImageItem | null = null;

  if (item && isValidStreamingRun(item, runId)) {
    appended = { ...item, image: SegmentedImage.withSegment(item.image, segment) };
  }

  return appended;
}

function toReadyItem(runId: string, item?: ImageItem): ReadyImageItem | null {
  let readyItem: ReadyImageItem | null = null;

  if (item && isValidStreamingRun(item, runId) && SegmentedImage.isFullyDecoded(item.image)) {
    readyItem = { ...item, kind: 'ready' };
  }

  return readyItem;
}

function isDecodedImageItem(
  item: ImageItem | undefined,
): item is ReadyImageItem | StreamingImageItem {
  return isReadyImageItem(item) || isStreamingImageItem(item);
}

export const ImageItem = {
  toReadyItem,
  toStreamingItem,
  isReadyImageItem,
  isDecodedImageItem,
  isStreamingImageItem,
};
export const StreamingImageItem = {
  isValidStreamingRun,
  withAppendedSegment,
};
