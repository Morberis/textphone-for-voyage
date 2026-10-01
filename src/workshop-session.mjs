// Pure workshop consent state. This module never grants skills, abilities or points.
// The native adapter must separately verify any offered/acquired result.
export const WORKSHOP_KINDS = new Set(['ability', 'skill', 'technique']);
export const SESSION_STATUSES = new Set(['drafting', 'review', 'requested', 'closed']);
export const DRAFT_FIELDS = {
  name: 80, effect: 1200, limits: 1000, costs: 600, practice: 600, nativeCard: 1200
};

export function boundedText(value, label, maximum) {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return value.trim();
}

export function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`Invalid ${label}`);
  return value;
}

export function copy(value) { return JSON.parse(JSON.stringify(value)); }

export function validateWorkshopDraft(draft, nativeCardRequired = false) {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft) ||
      Object.getPrototypeOf(draft) !== Object.prototype) throw new Error('Invalid draft');
  if (Object.keys(draft).some(key => !Object.hasOwn(DRAFT_FIELDS, key))) {
    throw new Error('Unknown draft field');
  }
  if(typeof draft.name==='string'&&/[\r\n]/.test(draft.name))throw new Error('Draft name must be one line');
  return Object.fromEntries(Object.entries(DRAFT_FIELDS).filter(([key]) =>
    key !== 'nativeCard' || nativeCardRequired || Object.hasOwn(draft, key)).map(([key, maximum]) =>
    [key, boundedText(draft[key], `draft ${key}`, maximum)]));
}

export function validateSession(session, actorName) {
  boundedText(actorName, 'actor', 160);
  if (!session || session.schemaVersion !== 1 || session.owner !== actorName ||
      !WORKSHOP_KINDS.has(session.kind) || !SESSION_STATUSES.has(session.status)) {
    throw new Error('Invalid, unsupported or differently owned workshop');
  }
  if (session.nativeCardRequired !== undefined && typeof session.nativeCardRequired !== 'boolean') {
    throw new Error('Invalid native card requirement');
  }
  positiveInteger(session.sequence, 'session sequence');
  positiveInteger(session.revision, 'draft revision');
  if (session.status === 'drafting' || session.status === 'review') {
    boundedText(session.request, 'design request', 1800);
  }
  if (session.status === 'review') validateWorkshopDraft(session.draft, session.nativeCardRequired);
  if (session.baseDraft) validateWorkshopDraft(session.baseDraft);
  if (session.concept) boundedText(session.concept, 'initial concept', 1800);
  if (session.status === 'requested' || session.approved) {
    if (!session.approved || session.approved.revision !== session.revision ||
        session.approved.owner !== actorName || session.approved.kind !== session.kind ||
        session.approved.sequence !== session.sequence ||
        session.approved.requestId !== requestId(session)) throw new Error('Invalid approval');
    validateWorkshopDraft(session.approved.draft, session.nativeCardRequired);
  }
  return session;
}

export function requestId(session) {
  return JSON.stringify(['textphone-workshop', session.owner, session.sequence, session.revision]);
}

export function beginWorkshopSession(previous, actorName, kind, request) {
  boundedText(actorName, 'actor', 160);
  if (!WORKSHOP_KINDS.has(kind)) throw new Error('Unknown workshop kind');
  const designRequest = boundedText(request, 'design request', 1800);
  if (previous) {
    validateSession(previous, actorName);
    if (previous.status !== 'closed') throw new Error('Close the current workshop before starting another');
  }
  const sequence = positiveInteger((previous?.sequence || 0) + 1, 'session sequence');
  return {
    schemaVersion: 1, owner: actorName, kind, sequence, revision: 1,
    status: 'drafting', request: designRequest, baseDraft: null, draft: null, approved: null,
    nativeCardRequired: kind !== 'skill'
  };
}

export function reviseWorkshopSession(session, actorName, request) {
  validateSession(session, actorName);
  if (!['drafting', 'review'].includes(session.status)) {
    throw new Error('This workshop has already been submitted or closed');
  }
  return {
    ...copy(session), revision: positiveInteger(session.revision + 1, 'draft revision'),
    status: 'drafting', request: boundedText(request, 'revision request', 1800),
    concept: session.awaitingConcept ? request.trim() : session.concept || session.request,
    baseDraft: session.draft ? validateWorkshopDraft(session.draft) :
      session.baseDraft ? validateWorkshopDraft(session.baseDraft) : null, draft: null
  };
}

// A late model response may never replace a newer revision or another owner's draft.
export function recordWorkshopDraft(session, actorName, revision, draft) {
  validateSession(session, actorName);
  if (revision !== session.revision || session.status !== 'drafting') {
    throw new Error('Stale or unexpected draft response');
  }
  return {...copy(session), status: 'review', draft: validateWorkshopDraft(draft, session.nativeCardRequired)};
}

// Returns one request receipt, not a native offer or a grant. Explicit current revision required.
export function confirmWorkshopDraft(session, actorName, revision) {
  validateSession(session, actorName);
  if (revision !== session.revision) throw new Error('Confirm the current draft revision');
  if (session.status === 'requested') return {session: copy(session), submission: null};
  if (session.status !== 'review') throw new Error('A complete reviewed draft is required');
  const approved = {
    requestId: requestId(session), owner: actorName, kind: session.kind,
    sequence: session.sequence, revision, draft: validateWorkshopDraft(session.draft)
  };
  return {
    session: {...copy(session), status: 'requested', approved: copy(approved)},
    submission: approved
  };
}

export function closeWorkshopSession(session, actorName) {
  validateSession(session, actorName);
  // Compatibility flag reports an approved receipt, not verified native acquisition.
  return {
    session: {...copy(session), status: 'closed', request: '', concept: null, baseDraft: null, draft: null},
    nativeRequestAlreadySent: Boolean(session.approved)
  };
}
