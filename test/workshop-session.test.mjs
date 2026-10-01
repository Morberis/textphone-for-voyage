import test from 'node:test';
import assert from 'node:assert/strict';
import {
  beginWorkshopSession, reviseWorkshopSession, recordWorkshopDraft,
  confirmWorkshopDraft, closeWorkshopSession, validateWorkshopDraft
} from '../src/workshop-session.mjs';

const actor = 'Test User';
const draft = {
  name: 'Steady Focus', effect: 'Focus on one stationary task for three seconds.',
  limits: 'Ordinary attention; hazards remain noticeable.',
  costs: 'Mild effort; repeated use causes fatigue.', practice: 'A brief seated focus exercise.'
};
const begin = (kind = 'ability') => beginWorkshopSession(null, actor, kind, 'Help me design a focus technique.');
const completeDraft = (kind = 'ability') => kind === 'skill' ? draft : {...draft,
  nativeCard: 'Focus on one stationary task for three seconds with ordinary attention; hazards remain noticeable. Mild effort causes fatigue with repetition.'};
const reviewed = (kind = 'ability') => recordWorkshopDraft(begin(kind), actor, 1, completeDraft(kind));

test('clarification replies retain the original concept until cancellation', () => {
  let session=begin('skill');
  session=reviseWorkshopSession(session,actor,'Only in clear daylight.');
  session=reviseWorkshopSession(session,actor,'Ten metres at beginner pace.');
  assert.equal(session.concept,'Help me design a focus technique.');
  assert.equal(closeWorkshopSession(session,actor).session.concept,null);
});

test('all three kinds preserve the complete specification without granting anything', () => {
  for (const kind of ['ability', 'skill', 'technique']) {
    const prior = reviewed(kind);
    const result = confirmWorkshopDraft(prior, actor, 1);
    assert.deepEqual(result.submission.draft, completeDraft(kind));
    assert.equal(result.submission.kind, kind);
    assert.equal(result.session.status, 'requested');
    assert.equal(prior.status, 'review');
    assert.deepEqual(Object.keys(result), ['session', 'submission']);
  }
});

test('a revised draft rejects the old generation response and old confirmation', () => {
  const next = reviseWorkshopSession(reviewed(), actor, 'Use two seconds instead.');
  assert.deepEqual(next.baseDraft, completeDraft());
  assert.equal(next.draft, null);
  assert.throws(() => recordWorkshopDraft(next, actor, 1, draft), /Stale/);
  assert.throws(() => confirmWorkshopDraft(next, actor, 1), /current/);
  assert.throws(() => confirmWorkshopDraft(next, actor, 2), /complete/);
  const accepted = recordWorkshopDraft(next, actor, 2, {...completeDraft(), effect: 'Focus for two seconds.', nativeCard: 'Focus on a stationary task for two seconds with ordinary attention; hazards remain noticeable. Mild effort causes fatigue with repetition.'});
  assert.equal(confirmWorkshopDraft(accepted, actor, 2).submission.draft.effect, 'Focus for two seconds.');
});

test('confirmation is idempotent across save/reload and cannot be silently revised', () => {
  const {session, submission} = confirmWorkshopDraft(reviewed(), actor, 1);
  const restored = JSON.parse(JSON.stringify(session));
  assert.equal(confirmWorkshopDraft(restored, actor, 1).submission, null);
  assert.throws(() => reviseWorkshopSession(restored, actor, 'Change the limits'), /submitted/);
  assert.throws(() => recordWorkshopDraft(restored, actor, 1, draft), /unexpected/);
  assert.deepEqual(restored.approved, submission);
});

test('another player cannot read into or modify the session through these operations', () => {
  const state = reviewed();
  for (const operation of [
    () => reviseWorkshopSession(state, 'Other User', 'Change it'),
    () => confirmWorkshopDraft(state, 'Other User', 1),
    () => closeWorkshopSession(state, 'Other User'),
    () => recordWorkshopDraft(begin(), 'Other User', 1, draft)
  ]) assert.throws(operation, /owned/);
  assert.equal(state.status, 'review');
});

test('cancel clears active draft; it never pretends to withdraw an existing native request', () => {
  const before = closeWorkshopSession(reviewed(), actor);
  assert.equal(before.nativeRequestAlreadySent, false);
  assert.equal(before.session.draft, null);
  assert.equal(before.session.request, '');
  assert.throws(() => confirmWorkshopDraft(before.session, actor, 1), /complete/);
  const approved = confirmWorkshopDraft(reviewed(), actor, 1).session;
  const after = closeWorkshopSession(approved, actor);
  assert.equal(after.nativeRequestAlreadySent, true);
  assert.deepEqual(after.session.approved, approved.approved);
  const next = beginWorkshopSession(after.session, actor, 'skill', 'A new design');
  assert.equal(next.sequence, 2);
  assert.equal(next.approved, null);
});

test('partial, oversized and extra model fields cannot become an approved draft', () => {
  assert.throws(() => validateWorkshopDraft({...draft, costs: ''}), /costs/);
  assert.throws(() => validateWorkshopDraft({...draft, name: 'a'.repeat(81)}), /name/);
  assert.throws(() => validateWorkshopDraft({...draft, grantAbility: true}), /Unknown/);
  assert.throws(() => validateWorkshopDraft({...draft, effect: 'bad\u0000data'}), /effect/);
  assert.throws(() => validateWorkshopDraft([]), /Invalid/);
  assert.throws(() => beginWorkshopSession(null, actor, 'ability', 'a'.repeat(1801)), /request/);
  assert.throws(() => beginWorkshopSession(reviewed(), actor, 'skill', 'Another design'), /Close/);
});

test('returned copies do not allow callers to mutate the stored approved draft', () => {
  const original = reviewed();
  const {session, submission} = confirmWorkshopDraft(original, actor, 1);
  submission.draft.limits = 'Changed elsewhere';
  original.draft.costs = 'Changed elsewhere';
  assert.equal(session.approved.draft.limits, draft.limits);
  assert.equal(session.approved.draft.costs, draft.costs);
});

test('unsupported saves and exhausted sequence numbers fail without mutation', () => {
  const state = reviewed();
  assert.throws(() => confirmWorkshopDraft({...state, schemaVersion: 2}, actor, 1), /unsupported/);
  const closed = closeWorkshopSession(state, actor).session;
  assert.throws(() => beginWorkshopSession({...closed, sequence: Number.MAX_SAFE_INTEGER}, actor, 'skill', 'New'), /sequence/);
  const approved = confirmWorkshopDraft(state, actor, 1).session;
  approved.approved.owner = 'Other User';
  assert.throws(() => confirmWorkshopDraft(approved, actor, 1), /approval/);
});

test('new ability and technique drafts require an explicitly reviewed purchase card', () => {
  const nativeCard = 'Focus for three seconds on one stationary task with ordinary attention. Hazards remain noticeable; repeated mild effort causes fatigue.';
  for (const kind of ['ability', 'technique']) {
    const session = begin(kind);
    assert.throws(() => recordWorkshopDraft(session, actor, 1, draft), /nativeCard/);
    assert.equal(session.status, 'drafting');
    const review = recordWorkshopDraft(session, actor, 1, {...draft, nativeCard});
    assert.equal(review.approved, null);
    const restored = JSON.parse(JSON.stringify(review));
    const approved = confirmWorkshopDraft(restored, actor, 1);
    assert.equal(approved.submission.draft.nativeCard, nativeCard);
    const revised = reviseWorkshopSession(review, actor, 'Change duration to two seconds.');
    assert.throws(() => confirmWorkshopDraft(revised, actor, 1), /current/);
    assert.throws(() => recordWorkshopDraft(revised, actor, 2, draft), /nativeCard/);
  }
  assert.deepEqual(recordWorkshopDraft(begin('skill'), actor, 1, draft).draft, draft);
});

test('legacy sessions remain valid without silently inventing a purchase card', () => {
  const legacy = begin();
  delete legacy.nativeCardRequired;
  const reviewedLegacy = recordWorkshopDraft(legacy, actor, 1, draft);
  const approved = confirmWorkshopDraft(reviewedLegacy, actor, 1);
  const restored = JSON.parse(JSON.stringify(approved.session));
  assert.deepEqual(restored.approved.draft, draft);
  assert.equal(confirmWorkshopDraft(restored, actor, 1).submission, null);
  assert.deepEqual(closeWorkshopSession(restored, actor).session.approved.draft, draft);
});

test('purchase-card validation rejects invalid text rather than truncating it', () => {
  for (const nativeCard of ['', 'x'.repeat(1201), 'bad\u0000card']) {
    assert.throws(() => validateWorkshopDraft({...draft, nativeCard}), /nativeCard/);
  }
  const nativeCard = 'x'.repeat(1200);
  assert.equal(validateWorkshopDraft({...draft, nativeCard}).nativeCard, nativeCard);
});
