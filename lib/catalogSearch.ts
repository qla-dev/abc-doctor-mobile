/** Match every search word, ignoring case, accents and word order. */
export function matchesCatalogSearch(query: string, ...fields: (string | null | undefined)[]): boolean {
  const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd');
  const text = normalize(fields.filter(Boolean).join(' '));
  return normalize(query).trim().split(/\s+/).every(word => text.includes(word));
}
