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