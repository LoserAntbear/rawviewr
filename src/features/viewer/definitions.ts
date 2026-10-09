export enum ViewerBackground {
  black = 'black',
  white = 'white',
  editor = 'editor',
  checker = 'checker',
  magenta = 'magenta',
}

export const DEFAULT_VIEWER_CONFIGURATION = {
  tileSize: 220,
} as const;
export const DEFAULT_VIEWER_BACKGROUND = ViewerBackground.checker;
