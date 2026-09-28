export function buildLabel(id: string, detail?: string): string {
  const name = id.toUpperCase();

  return detail ? `${name} — ${detail}` : name;
}
