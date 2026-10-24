# Improvements

- Move covered file extensions to a vscode configuration menu of the extension, so that users can add their own file extensions to be covered by the extension. If it is possible.
- Add support for custom parsers for specific file types.
- Add support for merging multiple files into a single view, with ability to specify offsets and sizes for each file.
- Add RMB action on gallery item to show the selected image in explorer view.
- Add custom header presets support with related config/parser
- Add script builders in a webview worker gated on Workspace Trust
- Add serialization of the webview with `WebviewPanelSerializer`.
- Add offload testing on webview activity state change: 'visible', 'background'. However, for now I've set `retainContextWhenHidden` to true, so that the webview is not disposed when hidden.

- Add image source streaming support for large files.
  - Add own streaming over `webview.asWebviewUri` + `fetch` to support large files efficiently.
  Since `asWebviewUri` only works for local resources and requires the file's directory to be included in `localResourceRoots`, custom streaming is needed for efficient handling of large files.

- Handle canvas dimension limits (~16384px per side plus a total-area cap) for large sensor dumps — long term this means drawing only the visible region via `ctx.setTransform` rather than sizing a canvas to the image. Ties into the existing frame-tiles option.

- Add toolbar or the whole UI caching to avoid redundant recalculations and avoid flickering during switching views.

- ~~Add YUV format support~~ **Landed for the packed families.**
  yuv420 is planar. I don't have support for it yet.
  Will require new row decoders, bpp and probe for planes, not packed pixels.
