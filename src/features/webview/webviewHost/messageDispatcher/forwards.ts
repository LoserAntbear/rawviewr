import { isPresent } from '@guards/valueGuards';

import type { MessageForwardMap } from '../../messaging';
import { StoreSliceId } from '../../store/definitions';
import type { StoreEventMap } from '../../store/types';

export const STORE_EVENT_FORWARDS: MessageForwardMap<StoreEventMap> = {
  'images:decode:requested': ({ ids }, { store }) => ({
    type: 'sources:request:decode',
    ids: ids.map((id) => store.get(StoreSliceId.Sources).getSource(id)).filter(isPresent),
    options: store.get(StoreSliceId.DecodeOptions).options,
  }),
};
