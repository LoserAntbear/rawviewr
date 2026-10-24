import { isPresent } from '@guards/valueGuards';
import type { MessageForwardMap } from '@SHARED/features/messaging';
import type { WebviewMessage } from '@SHARED/features/messaging/protocol';
import { toPreservedOptions } from '@SHARED/features/settings/snapshot';
import type { WebviewResolverContext } from '@WEBVIEW/features/messaging';
import { StoreSliceId } from '@WEBVIEW/features/store/definitions';
import type { StoreEventMap } from '@WEBVIEW/features/store/types';

export const STORE_EVENT_FORWARDS: MessageForwardMap<WebviewMessage, StoreEventMap, WebviewResolverContext> = {
  'probe:receive:source-bytes:requested': ({ id, location }, { store }) => ({
    id,
    location,
    type: 'probe:request',
    endian: store.get(StoreSliceId.DecodeOptions).options.endian,
  }),

  'decodeOptions:snapshot:requested': ({ options }, { store }) => ({
    type: 'decode:options:snapshot',
    snapshot: {
      options: toPreservedOptions(options),
      preserved: store.get(StoreSliceId.Config).preserveOptionsForAllWindows,
    },
  }),

  'images:decode:requested': ({ ids }, { store }) => ({
    type: 'sources:request:decode',
    ids: ids.map((id) => store.get(StoreSliceId.Sources).getSource(id)).filter(isPresent),
    options: store.get(StoreSliceId.DecodeOptions).options,
  }),
};
