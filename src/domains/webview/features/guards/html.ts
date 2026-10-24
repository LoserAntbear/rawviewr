export function validateCanvas(canvas: unknown): asserts canvas is HTMLCanvasElement {
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('Invalid canvas element');
  }
}
