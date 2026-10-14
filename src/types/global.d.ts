declare module '*.html' {
  const content: string;
  export default content;
}

declare module '*.css' {
  const content: string;
  export default content;
}

declare type Strip<T extends string, P extends string> = T extends `${P}.${infer R}` ? R : never;

/**
 * IntersectionObserver v2. Chromium ships `delay` and `trackVisibility`;
 * TypeScript's DOM does not yet include these properties. Extending.
 */
interface IntersectionObserverInit {
  delay?: number;
  trackVisibility?: boolean;
}

/**
 * VSCode-provided API for webviews, see https://code.visualstudio.com/api/extension-guides/webview#passing-messages-from-a-webview-to-an-extension
 */
declare function acquireVsCodeApi<
  State = unknown,
  Message = unknown,
>(): {
  getState: () => State;
  setState: (newState: State) => void;
  postMessage: (message: Message) => void;
};
declare type UnionToIntersection<TUnion> = (
  TUnion extends unknown ? (member: TUnion) => void : never
) extends (member: infer TIntersection) => void
  ? TIntersection
  : never;
