// Catalog constraints used by the native mod builder and the older pure prototype.
export function validateAppCatalog(catalog) {
  if (!Array.isArray(catalog) || catalog.length > 128) throw new Error('Invalid catalog');
  const ids = new Set();
  const labels = new Set();
  for (const app of catalog) {
    if (typeof app.id !== 'string' || !/^[a-z][a-z0-9_-]{0,47}$/.test(app.id))
      throw new Error('Invalid app ID');
    if (ids.has(app.id)) throw new Error('Duplicate app ID');
    ids.add(app.id);
    if (typeof app.label !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9 &'-]{0,31}$/.test(app.label))
      throw new Error('Invalid display label');
    const key = app.label.toLowerCase();
    if (labels.has(key)) throw new Error('Ambiguous display label');
    labels.add(key);
  }
  return catalog;
}
