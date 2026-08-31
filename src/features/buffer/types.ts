export type BufferItemData = {
  readonly id: string;
  readonly name: string;
  readonly data: ArrayBuffer;

  readonly detail?: string;
  readonly error?: string;
};

export type BufferBuildPayload = {
  id: string;
  name: string;
  data: ArrayBuffer;

  detail?: string;
  // If you ever need, for example, to support ancient versions of VSCode.
  base64?: string;
};
