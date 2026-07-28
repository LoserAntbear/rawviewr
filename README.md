# Raw Image Viewer

A VS Code extension for looking at image data that has no container around it —
framebuffer dumps, texture blobs, sprite payloads, `bytearray`s pulled out of a
debugger. You tell it how the bytes are laid out; it draws them.

![formats](https://img.shields.io/badge/formats-31-blue) ![no deps](https://img.shields.io/badge/runtime%20deps-none-green)

## What it does

- **31 pixel formats** across 16-bit packed, 32-bit, 24-bit, 8-bit packed,
  grayscale and sub-byte layouts — switchable from a dropdown without reloading.
- **Manual geometry**: width, height, byte offset and row stride, all
  overridable. Leave a field empty and it is derived from the buffer.
- **Dimension guessing** for buffers where you have no idea: ranked candidates
  that divide the buffer exactly, favouring sane aspect ratios and common
  display widths.
- **Multi-image viewing**: a gallery of files as tiles, and a tile grid of
  frames inside a single buffer.
- **Pixel probe**: hover to read a pixel's coordinates, decoded RGBA, and the
  source byte offset the value came from.
- **PNG export** of whatever is currently on screen.

Everything decodes in the webview, so changing format or size is instant.

## Getting started

```bash
cd extension
npm install
npm run build
```

Then press <kbd>F5</kbd> in VS Code to launch an Extension Development Host, and
open something from [`samples/`](samples/) — those are generated test cards that
decode back to a known image, so they are a good way to learn the controls.

To install it properly, `npm run vsix` produces `raw-image-viewer.vsix`, which
you can install with **Extensions: Install from VSIX…**.

## Opening buffers

| How | What you get |
| --- | --- |
| Click a `.raw`, `.imag`, `.fb`, `.rgb`, `.rgba`, `.565`, `.gray`, `.pix`, `.tex` file | Opens in the viewer directly |
| Right-click any file → **Open in Raw Image Viewer** | Works on any extension |
| **Reopen Editor With…** → Raw Image Viewer | Same, from an already-open file |
| Select several files → **Open Gallery (Raw Images)** | Tile grid with shared settings |
| Right-click a folder → **Open Folder as Raw Image Gallery** | Every matching file in the folder |

Decode settings are remembered per buffer in workspace state, so reopening a
file lands on the view you left it in. **Raw Image: Reset Remembered Decode
Settings** clears them.

## Formats

Channels are named **most-significant-bit first within the packed word**, the
convention used by hardware datasheets and the Khronos/DirectX docs. So
`RGBA4444` reads red from bits 15..12 and alpha from bits 3..0.

Different toolchains disagree about this — plenty of code calls that same layout
`ARGB4444`. That is precisely why every permutation is present and switching is
one click: if the image comes out with swapped channels, try the neighbouring
entry.

| Group | Formats |
| --- | --- |
| 16-bit packed | RGBA4444, ARGB4444, ABGR4444, BGRA4444, RGBX4444, XRGB4444, RGB565, BGR565, RGBA5551, BGRA5551, ARGB1555, ABGR1555, XRGB1555 |
| 32-bit | RGBA8888, ARGB8888, ABGR8888, BGRA8888, RGBX8888, XRGB8888, BGRX8888, XBGR8888 |
| 24-bit | RGB888, BGR888 |
| 8-bit packed | RGB332, BGR233 |
| Grayscale | GRAY8, A8, GRAY16 |
| Sub-byte | GRAY4 (2 px/byte), GRAY2 (4 px/byte), GRAY1 (8 px/byte) |

The 32-bit and 24-bit names describe **byte order on disk**, which is how
everyone names those. The 16-bit names describe **bit fields in the word**, so
they are affected by the byte-order toggle; the 8-bit-per-channel ones are not
(the control disables itself when it would do nothing).

## Controls

| Control | Notes |
| --- | --- |
| Format | Grouped dropdown of the table above |
| Size | Width × height. Empty = guessed / derived from what is left |
| Guess size | Ranked candidates for this buffer size and format |
| Offset | Bytes skipped before the first pixel |
| Stride | Bytes per row including padding. Empty = tightly packed. Fixes diagonal skew |
| Byte order | Little/big endian for packed words. Disabled when it makes no difference |
| Bit order | MSB/LSB first, shown only for sub-byte formats |
| Alpha | Honour it, or force everything opaque — useful when a buffer has garbage in the alpha channel and renders as nothing |
| un-premul | Divide colour by alpha for premultiplied buffers |
| flip Y | For bottom-up buffers (OpenGL, BMP) |
| Container | Unwrap a wrapper before decoding (see below) |
| Header | Read width/height from the first bytes: `u16`/`u32`, LE or BE |
| Background | Checker, black, white, magenta or editor colour behind transparent pixels |
| Zoom | `+` / `-` / fit / 1:1, or <kbd>Ctrl</kbd>+scroll. Always nearest-neighbour |
| Frame | Appears when the buffer holds more than one image. Arrow keys step frames; **tiles** shows them all at once |

Keyboard: <kbd>←</kbd>/<kbd>→</kbd> frames, <kbd>+</kbd>/<kbd>-</kbd> zoom,
<kbd>0</kbd> actual size, <kbd>f</kbd> fit.

## Settings

All under `rawImageViewer.`: `defaultFormat`, `defaultWidth`, `defaultHeight`,
`defaultOffset`, `defaultLittleEndian`, `defaultAlphaMode`, `background`,
`tileSize`, `maxFileSizeMB` (default 64), `galleryIncludeGlob`.

## Layout

```
src/common/formats.ts    pixel format registry — bit fields in, RGBA8888 out
src/common/decode.ts     geometry, containers, frames, probing, size guessing
src/common/protocol.ts   host <-> webview messages
src/viewer.ts            webview plumbing, HTML shell, per-buffer persistence
src/extension.ts         custom editors, commands, gallery panels
src/webview/main.ts      the UI
media/viewer.css         styles, themed off VS Code colour variables
samples/                 generated test buffers
```

`src/common/` has no dependency on `vscode` or on the DOM, so it is the same
code in both processes and is straightforward to test standalone.
