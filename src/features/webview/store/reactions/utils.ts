import type { ImageItem } from '../slice/ImagesSlice/types';

export function selectUndecodedIds(
  requestedIds: ReadonlySet<string>,
  alreadyDecodedImages: ReadonlyMap<string, ImageItem>,
): readonly string[] {
  return [...requestedIds].filter((id) => !alreadyDecodedImages.has(id));
}
