import type { Endian } from '@definitions/bits';
import type { DecodeOptions } from '@features/image/imageDecoder/types';
import type { SourceBytesResult, SourceLocation } from '@features/image/sourceReader/types';
import type { FileSource } from '@features/viewer';
import { attemptAsync } from '@utils/attempt';

import type { HostMessageResolverMap, HostResolverContext } from './types';

type ProbeRequestMessage = {
  id: string;
  endian: Endian;
  location: SourceLocation;
};

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

async function decode(
  sources: readonly FileSource[],
  options: DecodeOptions,
  { bridge, decodes }: HostResolverContext,
): Promise<void> {
  // Await each to chain the calls: one after the other.
  for await (const images of decodes.run(sources, options)) {
    await bridge.post({ type: 'images:decode:ready', images });
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
