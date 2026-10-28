import type { FileSource } from '@EXTENSION/features/viewer';
import type {
  DecodedFileSource,
  DecodeOptions,
} from '@SHARED/features/image/imageDecoder/types';
import type { SourceBytesResult } from '@SHARED/features/image/sourceReader/types';
import { attemptAsync } from '@utils/attempt';

import type {
  DecodeBatches,
  DecodeMessageByStage,
  DecodeStage,
  HostMessageResolverMap,
  HostResolverContext,
  ProbeRequestMessage,
} from './types';

async function startSession({ bridge, session, settings }: HostResolverContext): Promise<void> {
  const snapshot = settings.toolbarSnapshot;

  await bridge.post({
    viewMode: session.viewMode,
    type: 'session:start',
    decodeOptions: settings.readSessionDecodeOptions(),
    background: settings.readDefaultBackground(),
  });

  if (snapshot) {
    await bridge.post({ type: 'decode:options:preserved', snapshot });
  }

  await bridge.post({ type: 'view:config:update', config: settings.readViewerConfiguration() });
  await bridge.post({ type: 'sources:update', sources: [...session.sources] });
}

function groupByStage(images: readonly DecodedFileSource[]): DecodeBatches {
  const batches: DecodeBatches = { start: [], progress: [], ready: [] };

  for (const image of images) {
    switch (image.status) {
      case 'start':
        batches.start.push(image);
        break;
      case 'progress':
        batches.progress.push(image);
        break;
      // Any other is ready. Error is ready, interruption is ready as well.
      // They are to be handled respectively on the receiving end.
      default:
        batches.ready.push(image);
        break;
    }
  }

  return batches;
}

async function postStage<S extends DecodeStage>(
  bridge: HostResolverContext['bridge'],
  stage: S,
  images: DecodeBatches[S],
): Promise<void> {
  const message = {
    images,
    type: `images:decode:${stage}`,
  } as unknown as DecodeMessageByStage[S];

  await bridge.post(message);
}

async function postDecoded(
  bridge: HostResolverContext['bridge'],
  images: readonly DecodedFileSource[],
): Promise<void> {
  const stages = groupByStage(images);

  for (const [stage, images] of Object.entries(stages) as [DecodeStage, DecodeBatches[DecodeStage]][]) {
    if (!images.length) {
      continue;
    }

    await postStage(bridge, stage, images);
  }
}

async function decode(
  sources: readonly FileSource[],
  options: DecodeOptions,
  { bridge, decodes }: HostResolverContext,
): Promise<void> {
  for await (const images of decodes.run(sources, options)) {
    await postDecoded(bridge, images);
  }
}

async function readSourceBytes(
  { id, location, endian }: ProbeRequestMessage,
  { bridge, session, reader }: HostResolverContext,
): Promise<void> {
  const source = session.sourceFor(id);

  if (source) {
    await bridge.post({
      id,
      location,
      type: 'probe:receive:source-bytes',
      // A failed read is an answer too: without one the view waits on a reply never coming.
      result: await attemptAsync<SourceBytesResult>(
        async () => ({ kind: 'received', bytes: await reader.readFromFileSource(source, location, endian) }),
        (error) => ({ kind: 'failed', message: error instanceof Error ? error.message : String(error) }),
      ),
    });
  }
}

/**
 * Handlers for messages arriving FROM the webview.
 */
export const WEBVIEW_MESSAGE_RESOLVERS: HostMessageResolverMap = {
  'app:ready': (_message, context) => startSession(context),
  'app:status': ({ level, message }, { messages }) => messages.handleMessage({ level, message }),
  'export:png': ({ id, name, data }, { session, exporter }) => exporter.savePng(session.sourceFor(id)?.uri, name, data),
  'probe:request': (message, context) => readSourceBytes(message, context),
  'gallery:openItem': async ({ id }, { session, uriOpener }) => {
    const source = session.sourceFor(id);

    if (source) {
      await uriOpener?.openSingle([source.uri]);
    }
  },
  'view:fieldFocus': ({ focused }, { contextKeys }) => contextKeys.set(contextKeys.KEYS.FieldFocus, focused),
  'sources:request:decode': ({ ids, options }, context) => decode(ids, options, context),
  'decode:options:snapshot': ({ snapshot }, { settings }) => settings.writeToolbarSnapshot(snapshot),
};
