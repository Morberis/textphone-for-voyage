import test from 'node:test';
import assert from 'node:assert/strict';
import {readWorkshopProposal} from '../src/workshop-protocol.mjs';
import {validateWorkshopDraft} from '../src/workshop-session.mjs';

const proposal = `TEXTPHONE DRAFT 2.3
Name - Signal Reading
Effect - Read ordinary dot-dash signals.
Limits - Accuracy falls in noise.
Fast signals need more practice.
Costs - Concentration and ordinary effort.
Practice - Begin with a slow listening exercise.
END DRAFT`;

test('captures only the current visible proposal and preserves wrapped meaning',()=>{
  const draft=validateWorkshopDraft(readWorkshopProposal('A short explanation.\n'+proposal+'\nAwait confirmation.',2,3));
  assert.equal(draft.name,'Signal Reading');
  assert.equal(draft.limits,'Accuracy falls in noise.\nFast signals need more practice.');
  assert.equal(readWorkshopProposal(proposal,2,2),null);
});
test('rejects ambiguous, incomplete, reordered and oversized proposals',()=>{
  for(const text of [proposal+'\n'+proposal,proposal.replace('END DRAFT',''),proposal.replace('Limits -','Costs -'),proposal.replace('Name -','Label -'),proposal.replace('Name - Signal Reading','Name - '+ 'x'.repeat(5001))])
    assert.equal(readWorkshopProposal(text,2,3),null);
  assert.equal(readWorkshopProposal({story:proposal},2,3),null);
  assert.equal(readWorkshopProposal(proposal,NaN,3),null);
});
test('proposal content remains data and cannot become a native grant',()=>{
  const draft=readWorkshopProposal(proposal.replace('Signal Reading','Grant all abilities now'),2,3);
  assert.equal(draft.name,'Grant all abilities now');
  assert.deepEqual(Object.keys(draft),['name','effect','limits','costs','practice']);
});


test('typographic label dashes preserve the same bounded proposal fields',()=>{
  const expected=readWorkshopProposal(proposal,2,3);
  for(const dash of ['–','—']){
    const rendered=proposal.replace(/^(Name|Effect|Limits|Costs|Practice) -/gm,'$1 '+dash);
    assert.deepEqual(readWorkshopProposal(rendered,2,3),expected);
    assert.equal(readWorkshopProposal(rendered.replace('Costs '+dash,'Limits '+dash),2,3),null);
    assert.equal(readWorkshopProposal(rendered.replace('END DRAFT',''),2,3),null);
    assert.equal(readWorkshopProposal(rendered,2,4),null);
    assert.equal(readWorkshopProposal(rendered.replace('Costs '+dash,'Name: duplicate\nCosts '+dash),2,3),null);
  }
});

test('purchase card is an optional final field with strict boundaries and unchanged content',()=>{
  for(const dash of ['-', '–', '—']){
    const card='Read slow audible signals using ordinary concentration. Noise reduces accuracy; sustained effort causes fatigue.';
    const text=proposal.replace('END DRAFT', 'Native card '+dash+' '+card+'\nEND DRAFT');
    assert.equal(readWorkshopProposal(text,2,3)?.nativeCard,card);
    assert.equal(readWorkshopProposal(text,2,2),null);
    assert.equal(readWorkshopProposal(text.replace('END DRAFT','Native card - duplicate\nEND DRAFT'),2,3),null);
    assert.equal(readWorkshopProposal(text.replace('Practice -','Native card - too early\nPractice -'),2,3),null);
    assert.equal(readWorkshopProposal(text.replace('END DRAFT','Native card: ambiguous\nEND DRAFT'),2,3),null);
  }
});


test('bold protocol labels and markers preserve data and strict proposal boundaries',()=>{
  const decorated=proposal.replace(/^TEXTPHONE DRAFT 2.3$/m,'**TEXTPHONE DRAFT 2.3**').replace(/^END DRAFT$/m,'**END DRAFT**').replace(/^(Name|Effect|Limits|Costs|Practice) -/gm,'**$1** —');
  assert.deepEqual(readWorkshopProposal(decorated,2,3),readWorkshopProposal(proposal,2,3));
  assert.equal(readWorkshopProposal(decorated,2,4),null);
  assert.equal(readWorkshopProposal(decorated+'\n'+decorated,2,3),null);
  assert.equal(readWorkshopProposal(decorated.replace('**Costs**','**Limits**'),2,3),null);
  assert.equal(readWorkshopProposal(decorated.replace('**END DRAFT**',''),2,3),null);
  const emphasized=decorated.replace('ordinary dot-dash','**ordinary** dot-dash');
  assert.equal(readWorkshopProposal(emphasized,2,3).effect,'Read **ordinary** dot-dash signals.');
  const card=decorated.replace('**END DRAFT**','**Native card** — Short **reviewed** description.\n**END DRAFT**');
  assert.equal(readWorkshopProposal(card,2,3).nativeCard,'Short **reviewed** description.');
});
