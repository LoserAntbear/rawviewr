import type {
  DecodedFileOutcome,
  DecodedFileSegment,
  DecodedFileStart,
} from '@SHARED/features/image/imageDecoder/types';
import { type FieldStrategies, Strategy } from '@utils/strategy';

import { StoreSliceId } from '../../definitions';
import { StoreSlice } from '../StoreSlice';

import { ImageItem, StreamingImageItem } from './ImageItem';
import type { ImagesSlicePayloads, ImagesState } from './types';

type IDPayload = { readonly id: string };

const DECODE_FLOW_END_BY_OUTCOME: FieldStrategies<
  DecodedFileOutcome,
  'status',
  [current: ImageItem | undefined],
  ImageItem | null
> = {
  interruption: () => null,
  failure: ({ id, message }) => ({ id, kind: 'failed', message }),
  success: ({ runId }, current) => ImageItem.toReadyItem(runId, current),
};

/**
 * Keeps and handles the data about PROCESSED images.
 */
export class ImagesSlice extends StoreSlice<StoreSliceId.Images, ImagesState, ImagesSlicePayloads> {
  public get selectedId(): string | null {
    return this.getState().selectedId;
  }

  constructor() {
    super(StoreSliceId.Images, { selectedId: null, byId: new Map() });
  }

  public getImage(id: string): ImageItem | undefined {
    return this.getState().byId.get(id);
  }

  public put(id: string, image: ImageItem): void;
  public put(entries: readonly [string, ImageItem][]): void;
  public put(idOrEntries: string | readonly [string, ImageItem][], image?: ImageItem): void {
    const currentState = this.getState();
    const byId = new Map(currentState.byId);

    if (typeof idOrEntries === 'string' && image !== undefined) {
      this.putSingle(idOrEntries, image, byId);
    } else if (Array.isArray(idOrEntries)) {
      idOrEntries.forEach(([id, img]) => {
        this.putSingle(id, img, byId);
      });
    }

    this.patch({ byId });
  }

  public startDecode(decodeStartRequests: readonly DecodedFileStart[]): void {
    this.put(decodeStartRequests.map((start) => [start.id, ImageItem.toStreamingItem(start)] as [string, ImageItem]));
  }

  public appendSegments(segments: readonly DecodedFileSegment[]): void {
    this.putResolved(segments, (message, current) => StreamingImageItem.withAppendedSegment(message, current));
  }

  public finalizeDecode(outcomes: readonly DecodedFileOutcome[]): void {
    this.putResolved(outcomes, (outcome, current) => Strategy.byField(
      DECODE_FLOW_END_BY_OUTCOME,
      'status',
      outcome,
      current,
    ));
  }

  public queueDecode(ids: readonly string[]): void {
    if (ids.length < 1) {
      return;
    }

    this.markPending(ids);

    // @ts-expect-error Will be fixed with custom payloads typings introduced slices.
    this.emit('decode:requested', { ids });
  }

  public clearAllExcept(ids: readonly string[]): void {
    const idsToKeep = new Set(ids);
    const currentState = this.getState();
    const currentEntries = [...currentState.byId];
    const entriesToDrop = currentEntries.filter(([id]) => !idsToKeep.has(id));

    if (entriesToDrop.length > 0) {
      this.patch({ byId: new Map(currentEntries.filter(([id]) => idsToKeep.has(id))) });
    }
  }

  public clear(): void {
    this.clearAllExcept([]);
  }

  public setSelected(selectedId: string | null): void {
    this.patch({ selectedId });
  }

  private putResolved<TMessage extends IDPayload>(
    messages: readonly TMessage[],
    resolve: (message: TMessage, current?: ImageItem) => ImageItem | null,
  ): void {
    const resolved = new Map<string, ImageItem>();

    for (const message of messages) {
      const next = resolve(message, resolved.get(message.id) ?? this.getImage(message.id));

      if (next) {
        resolved.set(message.id, next);
      }
    }

    if (resolved.size > 0) {
      this.put([...resolved]);
    }
  }

  private putSingle(id: string, image: ImageItem, byId: Map<string, ImageItem>): void {
    byId.set(id, image);
  }

  private markPending(ids: readonly string[]): void {
    this.put(ids.map((id) => [id, { id, kind: 'pending' }] as [string, ImageItem]));
  }
}
