import type { IntentResolverMap, Intent, IntentResolver } from './types';

export class IntentDispatcher {
  constructor(private readonly resolvers: IntentResolverMap) {}

  public dispatch(intent: Intent): Promise<void> {
    try {
      const resolver = this.resolvers[intent.kind] as IntentResolver;

      return resolver(intent);
    } catch (error) {
      console.error(`Failed to dispatch intent ${intent.kind}:`, error);

      return Promise.reject(error);
    }
  }
}
