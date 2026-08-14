import { BufferBuildPayload, BufferItem } from './types';

export function buildBufferItem(payload: BufferBuildPayload): BufferItem {
  return {
    id: payload.id,
    name: payload.name,
    detail: payload.detail,
    byteLength: payload.byteLength ?? 0,
  };
}
