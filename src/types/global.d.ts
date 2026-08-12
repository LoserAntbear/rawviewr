declare module '*.html' {
  const content: string;
  export default content;
}

declare module '*.css' {
  const content: string;
  export default content;
}


declare type Strip<T extends string, P extends string> = T extends `${P}.${infer R}` ? R : never;