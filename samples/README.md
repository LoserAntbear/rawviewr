# Sample buffers

Headerless buffers generated from a synthetic test card (colour bars, greyscale
ramp, alpha ramp, orange circle). Every one decodes back to that card when the
matching settings are dialled in — handy for checking the viewer behaves, and
for getting a feel for the controls.

Open any of them with **Open in Raw Image Viewer**, or select them all and use
**Open Gallery (Raw Images)**.

| File | What it exercises |
| --- | --- |
| `testcard_64x64_rgba4444.raw` | RGBA4444 little-endian, no header |
| `testcard_64x64_argb4444.raw` | ARGB4444 — same card, alpha in the top nibble. Open it as RGBA4444 first to see what the wrong permutation looks like |
| `testcard_64x64_argb1555.raw` | ARGB1555 — 1-bit alpha |
| `testcard_128x96_rgb565.raw` | RGB565 little-endian, the usual embedded framebuffer format |
| `testcard_128x96_rgb565_be.raw` | RGB565 big-endian — flip **byte order** to read it |
| `testcard_96x64_rgb888.raw` | RGB888, 3 bytes per pixel |
| `testcard_96x64_bgra8888.raw` | BGRA8888, the Windows/DirectX byte order |
| `oled_128x64_gray1.raw` | 1-bit mono, MSB first, 8 pixels per byte |
| `framebuffer_320x240_rgb565_u16header.raw` | Leading `u16` LE width/height — set the header dropdown to `u16 LE w,h @0` and the size fills itself in |
| `strided_100x64_rgb565_stride256.raw` | Rows padded to a 256-byte stride. Leave **Stride** on auto to see the classic diagonal skew, then set it to 256 |
| `anim_32x32x8_rgb565.raw` | 8 stacked frames — frame navigation and the tile grid appear automatically |

## Things worth trying

- Open `testcard_64x64_rgba4444.raw` and clear the **Size** fields. The guess
  dropdown offers 64×64 first because it consumes the buffer exactly.
- Open `anim_32x32x8_rgb565.raw`, tick **tiles** in the Frame group, and all
  eight frames render as a grid.
- Hover any pixel: the status bar shows its coordinates, decoded RGBA, and the
  source byte offset the value came from.
