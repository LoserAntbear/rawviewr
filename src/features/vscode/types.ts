export interface UriLike {
  path: string;
  scheme: string;

  query?: string;
  fragment?: string;
  authority?: string;
}
