/***
 * Looks for tokens in the form of `{{token}}`
 */
const TOKEN_PATTERN = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;

export type TemplateValues<Tokens extends readonly string[]> = Readonly<
  Record<Tokens[number], string>
>;

/**
 * A simple string template replacer per se,
 * nothing sophisticated, no need for it now.
 *
 * Feel free to extend/replace with a more sophisticated template engine if needed.
 *
 * However, the template engine bring the complexity
 * and will be compiled into the bundle bloating the extension size, so let's keep it simple for now.
 */
export class StringTemplate<const Tokens extends readonly string[]> {
  constructor(
    private readonly source: string,
    private readonly tokens: Tokens,
    private readonly replacePattern: RegExp = TOKEN_PATTERN,
  ) {
    this.assertDelimitersWellFormed();
    this.assertTokensMatchSource();
  }

  public render(values: TemplateValues<Tokens>): string {
    return this.source.replace(
      this.replacePattern,
      (_match, token: string) => values[token as Tokens[number]],
    );
  }

  private assertTokensMatchSource(): void {
    const receivedTokens = new Set<string>(this.tokens);
    const foundTokens = this.findSourceTokens();
    const [undeclared, unused] = this.compareTokenSets(receivedTokens, foundTokens);

    if (undeclared.length > 0) {
      throw new Error(
        `Template contains undeclared token(s): ${undeclared.join(', ')}. ` +
          'They would render literally.',
      );
    }

    if (unused.length > 0) {
      throw new Error(
        `Template declares token(s) absent from the source: ${unused.join(', ')}. ` +
          'Likely a typo in the token list or in the template.',
      );
    }
  }

  /**
   * A nested delimiter (`{{ {{a}} }}`) brings a leftover that one
   * pass cannot reach. Rejecting it here is straightforward.
   * The alternative – re-running until stable – would let a substituted *value* introduce
   * new tokens, which could be exposed to template injection.
   */
  private assertDelimitersWellFormed(): void {
    const parsedString = this.source.replace(this.replacePattern, '');

    if (parsedString.includes('{{') || parsedString.includes('}}')) {
      throw new Error(
        'Template contains a malformed or nested delimiter. Every `{{` must open a ' +
          'well-formed `{{token}}`.',
      );
    }
  }

  private findSourceTokens(): ReadonlySet<string> {
    const foundTokens = new Set<string>();

    for (const [, token] of this.source.matchAll(this.replacePattern)) {
      foundTokens.add(token);
    }

    return foundTokens;
  }

  private compareTokenSets(
    tokensA: ReadonlySet<string>,
    tokensB: ReadonlySet<string>,
  ): [string[], string[]] {
    const missingInA = [...tokensB].filter((token) => !tokensA.has(token));
    const missingInB = [...tokensA].filter((token) => !tokensB.has(token));

    return [missingInA, missingInB];
  }
}
