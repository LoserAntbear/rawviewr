import { beforeEach, describe, expect, it, vi } from 'vitest';
import { window, workspace } from 'vscode';

import { ImageExporter } from './ImageExporter';

/** A real 1x1 PNG, as `OffscreenCanvas.convertToBlob({ type: 'image/png' })` produces. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

function arrayBufferOf(bytes: Buffer): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

const source = { path: '/src/frame.raw' } as never;

async function save(payload: unknown): Promise<void> {
  await new ImageExporter().savePng(source, 'frame.raw.png', payload as ArrayBuffer);
}

function reportedError(): string {
  return String(vi.mocked(window.showErrorMessage).mock.calls[0]?.[0] ?? '');
}

beforeEach(() => {
  vi.mocked(window.showSaveDialog).mockResolvedValue({ path: '/out/frame.raw.png' } as never);
});

describe('ImageExporter.savePng', () => {
  it('writes the bytes it was sent, unchanged', async () => {
    await save(arrayBufferOf(PNG_1X1));

    const [, written] = vi.mocked(workspace.fs.writeFile).mock.calls[0];

    expect(Buffer.from(written).equals(PNG_1X1)).toBe(true);
  });

  it('accepts a typed-array view, which some serialisers hand back', async () => {
    await save(new Uint8Array(PNG_1X1));

    expect(workspace.fs.writeFile).toHaveBeenCalledOnce();
  });

  it('writes nothing when the user cancels the save dialog', async () => {
    vi.mocked(window.showSaveDialog).mockResolvedValueOnce(undefined);

    await save(arrayBufferOf(PNG_1X1));

    expect(workspace.fs.writeFile).not.toHaveBeenCalled();
  });
});

describe('ImageExporter.savePng: payloads that did not survive the trip', () => {
  // The failure these guard against is not a crash: a buffer that serialised badly still
  // "writes", and produces a file that is not a PNG. Each case must refuse, and say why.
  it.each([
    ['an index map', { 0: 137, 1: 80 }, /did not arrive as binary/],
    ['an empty object', {}, /did not arrive as binary/],
    ['an empty buffer', new ArrayBuffer(0), /empty buffer/],
    ['bytes that are not a PNG', arrayBufferOf(Buffer.from('GIF89a-not-a-png')), /not a PNG/],
  ])('refuses %s', async (_label, payload, reason) => {
    await save(payload);

    expect(workspace.fs.writeFile).not.toHaveBeenCalled();
    expect(reportedError()).toMatch(reason);
  });
});
