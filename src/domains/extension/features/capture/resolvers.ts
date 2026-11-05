import { IntentKind } from '@definitions/intent';
import type { IntentResolverMap } from '@EXTENSION/features/intent/types';

import type { CaptureController } from './CaptureController';

type CaptureIntentKind =
  | IntentKind.captureGpuTrace;

export const CAPTURE_INTENT_RESOLVERS = (
  capture: CaptureController,
): Pick<IntentResolverMap, CaptureIntentKind> => ({
  [IntentKind.captureGpuTrace]: () => capture.captureGpuTrace(),
});
