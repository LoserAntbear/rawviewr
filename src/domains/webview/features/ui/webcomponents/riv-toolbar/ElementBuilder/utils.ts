export function readElementValue(element: HTMLElement): string {
  if (element instanceof HTMLInputElement && element.type === 'checkbox') {
    return element.checked ? 'true' : '';
  }

  if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) {
    return element.value;
  }

  return '';
}
