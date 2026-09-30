// World-configured destination exclusions only. No money, orders, quests or global state.
// A not-blocked result does not prove coverage, opening hours, funds or service eligibility.
const DEFAULT_BLOCKED_MESSAGE = "Delivery is unavailable at this address. Choose another drop-off location.";
const DEFAULT_DESTINATION_MESSAGE = "Choose a delivery address or drop-off location.";
function requireText(text, label, maximumLength) {
  if (typeof text !== "string" || !text.trim() || text.length > maximumLength || /[\u0000-\u001f\u007f]/u.test(text))
    throw new Error("Invalid " + label);
  return text;
}
export function validateDeliveryPolicy(policy) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) throw new Error("Invalid delivery policy");
  if (policy.blockedMessage !== undefined) requireText(policy.blockedMessage,"blocked message",512);
  if (policy.destinationRequiredMessage !== undefined) requireText(policy.destinationRequiredMessage,"destination message",512);
  if (!Array.isArray(policy.blockedLocations) || policy.blockedLocations.length > 512) throw new Error("Invalid blocked locations");
  const identities = new Set();
  for (const rule of policy.blockedLocations) {
    if (!rule || typeof rule !== "object" || Array.isArray(rule)) throw new Error("Invalid blocked location rule");
    requireText(rule.locationId,"blocked location ID",160);
    if (rule.areaId !== undefined) requireText(rule.areaId,"blocked area ID",160);
    if (rule.message !== undefined) requireText(rule.message,"location message",512);
    const identity = JSON.stringify([rule.locationId,rule.areaId ?? null]);
    if (identities.has(identity)) throw new Error("Duplicate blocked location rule");
    identities.add(identity);
  }
  return policy;
}
export function evaluateDeliveryDestination(policy, destination) {
  validateDeliveryPolicy(policy);
  if (!destination || destination.locationId === undefined || destination.locationId === null || destination.locationId === "")
    return {status:"destination-required",message:policy.destinationRequiredMessage ?? DEFAULT_DESTINATION_MESSAGE};
  requireText(destination.locationId,"destination location ID",160);
  if (destination.areaId !== undefined && destination.areaId !== null) requireText(destination.areaId,"destination area ID",160);
  const locationRules = policy.blockedLocations.filter(rule => rule.locationId === destination.locationId);
  const areaRule = destination.areaId ? locationRules.find(rule => rule.areaId === destination.areaId) : null;
  const locationRule = locationRules.find(rule => rule.areaId === undefined);
  const matchedRule = areaRule || locationRule;
  if (matchedRule) return {status:"blocked",message:matchedRule.message ?? policy.blockedMessage ?? DEFAULT_BLOCKED_MESSAGE};
  if (!destination.areaId && locationRules.some(rule => rule.areaId !== undefined))
    return {status:"destination-required",message:policy.destinationRequiredMessage ?? DEFAULT_DESTINATION_MESSAGE};
  return {status:"not-blocked",message:null};
}

// The app boundary supplies independent policies; there is no shared mutable blacklist.
export function evaluateAppDeliveryDestination(app, destination) {
  if (!app || typeof app !== "object") throw new Error("Invalid delivery app");
  requireText(app.id,"app ID",48);
  requireText(app.label,"app label",80);
  if (!app.delivery || typeof app.delivery !== "object" || Array.isArray(app.delivery))
    throw new Error("Missing app delivery configuration");
  return evaluateDeliveryDestination({
    ...app.delivery,
    blockedMessage:app.delivery.blockedMessage ?? app.label + " cannot deliver to this address. Choose another drop-off location.",
    destinationRequiredMessage:app.delivery.destinationRequiredMessage ?? "Choose a delivery address for " + app.label + "."
  }, destination);
}
