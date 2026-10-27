import { once } from 'node:events';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

/** Matches `DEFAULT_ROWS_PER_SEGMENT`, so the marker lines land on real band boundaries. */
const ROWS_PER_BAND = 64;
const BYTES_PER_PIXEL = 4;
const OPAQUE = 255;

function parseArgs(argv) {
  const args = {
    width: 8192,
    height: 8192,
    frames: 4,
    out: 'samples/big/bertha_8192x8192x4_rgba8888.raw',
  };

  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]?.replace(/^--/, '');
    const value = argv[index + 1];

    if (key && value !== undefined && key in args) {
      args[key] = key === 'out' ? value : Number(value);
    }
  }

  return args;
}

function buildRowTemplate(width) {
  const row = new Uint8Array(width * BYTES_PER_PIXEL);

  for (let x = 0; x < width; x += 1) {
    const at = x * BYTES_PER_PIXEL;

    row[at] = Math.round((x / Math.max(1, width - 1)) * 255);
    row[at + BYTES_PER_PIXEL - 1] = OPAQUE;
  }

  return row;
}

function paintRow(template, width, y, height, frameBlue) {
  const row = template.slice();
  const green = Math.round((y / Math.max(1, height - 1)) * 255);
  const onBandEdge = y % ROWS_PER_BAND === 0;
  const onGridLine = y % 1024 === 0;

  for (let x = 0; x < width; x += 1) {
    const at = x * BYTES_PER_PIXEL;

    row[at + 1] = green;
    row[at + 2] = frameBlue;
  }

  // Band edges are marked so a misplaced band breaks a visibly regular spacing.
  if (onBandEdge || onGridLine) {
    const mark = onGridLine ? 255 : 0;

    for (let x = 0; x < width; x += 1) {
      const at = x * BYTES_PER_PIXEL;

      row[at] = mark;
      row[at + 1] = mark;
      row[at + 2] = mark;
    }
  }

  return row;
}

async function write(stream, chunk) {
  if (!stream.write(chunk)) {
    await once(stream, 'drain');
  }
}

async function main() {
  const { width, height, frames, out } = parseArgs(process.argv.slice(2));
  const target = resolve(process.cwd(), out);
  const rowBytes = width * BYTES_PER_PIXEL;
  const total = rowBytes * height * frames;

  await mkdir(dirname(target), { recursive: true });

  const stream = createWriteStream(target, { highWaterMark: 1024 * 1024 * 8 });
  const template = buildRowTemplate(width);
  const started = Date.now();

  console.log(`${width}x${height}, ${frames} frame(s), rgba8888`);
  console.log(`  ${(rowBytes * height / 1024 ** 2).toFixed(0)} MiB a frame, ${(total / 1024 ** 3).toFixed(2)} GiB total`);
  console.log(`  ${height / ROWS_PER_BAND} bands a frame at ${ROWS_PER_BAND} rows each`);
  console.log(`  -> ${target}`);

  for (let frame = 0; frame < frames; frame += 1) {
    // Spread the frames across the blue range so each is plainly a different image.
    const frameBlue = Math.round((frame / Math.max(1, frames - 1)) * 200) + 55;

    for (let y = 0; y < height; y += 1) {
      await write(stream, paintRow(template, width, y, height, frameBlue));
    }

    console.log(`  frame ${frame + 1}/${frames} written (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  }

  stream.end();
  await once(stream, 'finish');

  console.log(`done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

await main();
