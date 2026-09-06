const KIB = 1024;
const MIB = KIB * KIB;

function formatBytes(bytes: number): string {
  if (bytes < KIB) {
    return `${bytes} B`;
  }

  if (bytes < MIB) {
    return `${(bytes / KIB).toFixed(1)} KiB`;
  }

  return `${(bytes / MIB).toFixed(2)} MiB`;
}

export const StringFormat = {
  bytes: formatBytes,
};
