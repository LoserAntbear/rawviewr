/**
 * What both processes speak. Nothing here may import from either side — see the domain rules
 * in eslint.config.mjs, and docs/overview/messaging.md for why the protocol lives here.
 */
export * from './features/messaging';
export * from './features/viewer';
export * from './features/disposable';
