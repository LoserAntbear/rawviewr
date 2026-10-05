import type { Endian } from '@definitions/bits';
import { BufferItem } from '@features/buffer/BufferItem';
import { SourceReader } from '@features/image/sourceReader/SourceReader';
import type { SourceBytes, SourceLocation } from '@features/image/sourceReader/types';
import type { FileSource } from '@features/webview/types';

/**
 * Reads what a {@link SourceLocation} points at, in the file on the disk it came from.
 */
export class SourceBytesReader {
  constructor(private readonly reader: SourceReader = new SourceReader()) {}

  public async read(
    source: FileSource,
    location: SourceLocation,
    endian: Endian,
  ): Promise<SourceBytes> {
    const item = await BufferItem.fromFileSource(source);

    return this.reader.read(new Uint8Array(item.data), location, endian);
  }
}
