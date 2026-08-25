import { AppContextProvider } from '@features/appContext/AppContextProvider';
import { ByteConverter } from '@utils/bits';

export class FileValidator {
  public static validateFileSize(
    fileSize: number,
    maxFileSizeMb: number = AppContextProvider.context.workspaceConfig.read('maxFileSizeMB'),
  ): boolean {
    const maxFileSize = Math.max(1, ByteConverter.from('MB', maxFileSizeMb));

    return fileSize <= maxFileSize;
  }
}
