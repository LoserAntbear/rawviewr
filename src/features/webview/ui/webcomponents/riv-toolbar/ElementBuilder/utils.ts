export function getElementValueIfAny(element: HTMLElement): string {
  if (Object.hasOwn(element, 'value')) {
    return (element as HTMLInputElement | HTMLSelectElement).value;
  }

  return '';
}

export function readElementValue(element: HTMLElement): string {
  let result = getElementValueIfAny(element);

  if (element instanceof HTMLInputElement &&element.type === 'checkbox') {
    result = element.checked ? 'true' : '';
  }

  return result;
}
