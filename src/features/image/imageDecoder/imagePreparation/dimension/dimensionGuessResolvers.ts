export function perfectSquareWidths(totalPixels: number): number[] {
  const root = Math.sqrt(totalPixels);

  return Number.isInteger(root) ? [root] : [];
}

export function divisorWidths(totalPixels: number): number[] {
  const widths: number[] = [];

  for (let width = 1; width * width <= totalPixels; width++) {
    if (totalPixels % width === 0) {
      widths.push(width, totalPixels / width);
    }
  }

  return widths;
}

export function commonImageWidths(): number[] {
  return [
    8, 16, 24, 28, 32, 40, 48, 64, 72, 80, 96, 100, 112, 128, 144, 160, 176, 192, 200, 208,
    224, 240, 256, 272, 288, 320, 352, 360, 384, 400, 416, 432, 448, 464, 480, 512, 540,
    576, 600, 640, 720, 728, 768, 800, 854, 900, 960, 1024, 1080, 1136, 1152, 1200, 1280,
    1366, 1440, 1600, 1680, 1920, 2048, 2560, 3200, 3840, 4096,
  ];
}