export enum RIVImageStateKind {
  Empty = 'empty',
  Error = 'error',
  Paint = 'paint',
  Loading = 'loading',
}

export enum RIVImageStateTransition {
  Failed = 'failed',
  Resolved = 'resolved',
  CloseBitmap = 'closeBitmap',
}
