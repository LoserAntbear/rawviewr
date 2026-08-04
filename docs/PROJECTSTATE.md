# Project state description

## Goal

A simple straightforward viewer VSCode extension for raw binary files.
With ability to provide a gallery view of multiple files.

- *potentially* with provision of custom parsers for specific file types.

Should support main 16, 24, 32 bit color formats, and some common pixel formats (like YUV).

With the ability to export the view to a PNG image.

- *potentially* can be added support for merging multiple files into a single view, with ability to specify offsets and sizes for each file.

## Current state

Provided a simple viewer for raw binary files, with ability to provide a gallery view of multiple files. Works as a POC as of now, with some basic features implemented:

- Viewer for raw binary files, with ability to provide a gallery view of multiple files.
- Support for main 16, 24, 32 bit color formats, and some common pixel formats (like YUV).
- Ability to export the view to a PNG image.
- Build passes and tests run successfully.
- vsix package is generated successfully and was succesfully installed in VSCode with local testing.

## Next steps

### Improvements

- Move covered file extensions to a vscode configuration menu of the extension, so that users can add their own file extensions to be covered by the extension. If it is possible.
- Add support for custom parsers for specific file types.
- Add support for merging multiple files into a single view, with ability to specify offsets and sizes for each file.
- Improve UI separation in a toolbar by groups:

  - Size: width, height
    - Add more default pressets, eg.: 16x16, 32x32, 64x64, 96x64
  - Format: color format, pixel format,
  - Header: offset, size, etc.
  - Export: export to PNG, export to other formats (if possible)

- Add RMB action on gallery item to show the selected image in explorer view.
- Add memo of the selected toolbar options, so that user does not have to reselect them every time.
- Add custom header presets support with related config/parser

### General refactor

Since the code here is merely POC, it is not well structured and needs a general refactor to improve maintainability and readability.

- Rewrite webview DOM components structure from html injection to custom elements, with proper separation of concerns and encapsulation.

#### Current refactor state

- decomposed extension entry point.
- introduced extension host responsible for main extension functionality provision (e.g. registering commands, cleanup)
- introduced intent-based architecture for command handling and communication between vscode-registered commands and extension functionality
  - introduced intent dispatcher responsible for dispatching intents to appropriate resolvers
  - introduced intent resolvers responsible for resolving intents to appropriate extension functionality
  - introduced command intent parsers responsible for parsing command arguments to intents and commad map for intent registration

- implemented basic defined viewer structure and functionality
  - provided viewer window controller for managing viewer window lifecycle and communication with webview
  - provided viewer registry for managing viewer instances and their lifecycle
  - introduced viewer-related intents and their resolvers as a seam b/w vscode commands and viewer functionality

- introduced strong vscode API integration with vscode API types, guards and utilities
- provided raw document class as a basic integration layer of `vscode.CustomDocument`
