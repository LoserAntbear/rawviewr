export enum RIVImageStateKind {
  Empty = 'empty',
  Error = 'error',
  Painted = 'painted',
  Loading = 'loading',
}

export enum RIVImageStateTransition {
  Failed = 'failed',
  Resolved = 'resolved',
  CloseBitmap = 'closeBitmap',
}
