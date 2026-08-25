import { AppContextProvider } from '@features/appContext/AppContextProvider';
import { ByteConverter } from '@utils/bits';

export class FileValidator {
  public static get maxFileSizeMB(): number {
    return AppContextProvider.context.workspaceConfig.read('maxFileSizeMB');
  }

  public static isValidFileSize(
    fileSize: number,
    maxFileSizeMb: number = FileValidator.maxFileSizeMB,
  ): boolean {
    const maxFileSize = Math.max(1, ByteConverter.from('MB', maxFileSizeMb));

    return fileSize <= maxFileSize;
  }
}
