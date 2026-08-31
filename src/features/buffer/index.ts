/**
 * Browser-safe surface only.
 *
 * `BufferItem` is deliberately NOT re-exported here: it imports the vscode API, and a
 * barrel import pulls the whole barrel into whatever bundle touches it — which breaks
 * the webview build with `Could not resolve "vscode"`. Extension-host code imports it
 * from '@features/buffer/BufferItem' directly.
 */
export * from './BufferItemRegistry';
export * from './types';
