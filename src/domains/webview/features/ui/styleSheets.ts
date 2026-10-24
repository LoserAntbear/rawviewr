export class StyleSheets {
  private static cachedSheets = new Map<string, CSSStyleSheet>();

  public static getStyleSheetFor(css: string): CSSStyleSheet {
    return this.cachedSheets.get(css) ?? this.buildStyleSheet(css);
  }

  public static adoptStyleSheet(target: DocumentOrShadowRoot, css: string): void {
    const sheet = this.getStyleSheetFor(css);

    if (target.adoptedStyleSheets.includes(sheet)) {
      return;
    }

    target.adoptedStyleSheets = [...target.adoptedStyleSheets, sheet];
  }

  private static buildStyleSheet(css: string): CSSStyleSheet {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    this.cachedSheets.set(css, sheet);

    return sheet;
  }
}
