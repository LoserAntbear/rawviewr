export const IMAGE_PROGRESS_LABELS = {
  queued: 'queued…',
  decoding: 'decoding…',
  reading: 'reading source…',
} as const;

export enum RIVTags {
  App = 'riv-app-component',
  Image = 'riv-image-component',
  Toolbar = 'riv-toolbar-component',
  Gallery = 'riv-gallery-component',
  MainView = 'riv-main-view-component',
  StatusBar = 'riv-status-bar-component',
}
