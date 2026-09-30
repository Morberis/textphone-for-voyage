// Per-app business listing policy. Discovery callbacks are supplied by a trusted world adapter.
// This is not a direct reader of Voyage's native visited-location records.
function requireIdentifier(identifier) {
  if (typeof identifier !== "string" || !identifier.trim() || identifier.length > 160 || /[\u0000-\u001f\u007f]/u.test(identifier))
    throw new Error("Invalid catalog identifier");
}
export function selectAppStores(app, entries, discovery = {}) {
  if (!app || !["all_public","known","visited","curated"].includes(app.storeListingMode))
    throw new Error("Invalid app listing mode");
  if (!Array.isArray(entries) || entries.length > 1024) throw new Error("Invalid app catalog");
  const identifiers = new Set();
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") throw new Error("Invalid catalog entry");
    requireIdentifier(entry.id);
    if (identifiers.has(entry.id)) throw new Error("Duplicate catalog entry");
    identifiers.add(entry.id);
    if (typeof entry.public !== "boolean") throw new Error("Catalog visibility must be explicit");
  }
  const candidates = entries.filter(entry => entry.public);
  if (app.storeListingMode === "all_public") return {status:"ready",entries:candidates};
  if (app.storeListingMode === "curated") {
    if (!Array.isArray(app.curatedIds) || app.curatedIds.length > 1024) throw new Error("Missing curated app IDs");
    app.curatedIds.forEach(requireIdentifier);
    return {status:"ready",entries:candidates.filter(entry => app.curatedIds.includes(entry.id))};
  }
  const readDiscovery = app.storeListingMode === "visited" ? discovery.isVisited : discovery.isKnown;
  if (typeof readDiscovery !== "function") return {status:"discovery-unavailable",entries:[]};
  const selected = [], unresolvedIds = [];
  for (const entry of candidates) {
    const discovered = readDiscovery(entry);
    if (discovered === true) selected.push(entry);
    else if (discovered !== false) unresolvedIds.push(entry.id);
  }
  return unresolvedIds.length ? {status:"discovery-incomplete",entries:selected,unresolvedIds} :
    {status:"ready",entries:selected};
}
