export interface BufferItem {
  id: string;
  name: string;
  byteLength: number;

  error?: string;
  detail?: string;
  base64?: string;
}

export type BufferBuildPayload = {
  id: string;
  name: string;

  detail?: string;
  byteLength?: number;
};
