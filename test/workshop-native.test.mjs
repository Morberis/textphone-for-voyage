import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {buildPhoneMod} from '../native/build-mod.mjs';
const base=JSON.parse(await fs.readFile(new URL('../config/generic-phone.json',import.meta.url),'utf8'));
base.apps=base.apps.filter(app=>app.id!=='workshop');
base.initialInstalledIds=base.initialInstalledIds.filter(id=>id!=='workshop');
const kinds=['ability','skill','technique'];
async function fixture(reverse=false){
  const config=structuredClone(base);
  config.apps.push({id:'workshop',label:'Workshop',order:10,pages:kinds.map(kind=>({name:kind[0].toUpperCase()+kind.slice(1)+' creation',kind:'workshop',workshopKind:kind,guidance:''}))});
  config.initialInstalledIds.push('workshop');
  const mod=await buildPhoneMod(config);
  let storage={},tick=0,action='',actor='Avery',players=null,story='',learned={};
  const key=()=>JSON.stringify(actor);
  const runPhase=phase=>{
    const effects=[],logs=[];
    let triggers=Object.values(mod.triggers).filter(t=>t.phase===phase&&!t.name.startsWith('phone_mod_config_')&&!t.name.startsWith('phone_mod_data_'));
    if(reverse)triggers=triggers.reverse();
    for(const trigger of triggers){
      const localEffects=[];
      vm.runInNewContext(trigger.script,{storage,triggers:mod.triggers,effects:localEffects,log:m=>logs.push(m),check:q=>({'action-text':[action],'story-text':story,'player-level':players||{[actor]:1},'game-tick':tick,'known-entity':false,'skill-value':learned[q.skill]===undefined?{}:{[actor]:learned[q.skill]}}[q.type])});
      effects.push(...localEffects);
    }
    return {effects,text:effects.map(e=>e.instruction).join('\n'),logs,phone:storage.phone_mod?.players[key()]};
  };
  return {mod,run(value){action=value;tick++;return runPhase('planning');},again(){return runPhase('planning');},capture(value){story=value;return runPhase('state');},get phone(){return storage.phone_mod?.players[key()];},get storage(){return storage;},reload(){storage=JSON.parse(JSON.stringify(storage));},learn(skill){learned[skill]=1;},multiplayer(){players={Avery:1,Blair:1};}};
}
function proposal(session,name='Quiet Focus'){
  const card=session.nativeCardRequired?'Native card - Focus briefly on a stationary task with mild mental effort; moving targets break concentration.\n':'';
  return `TEXTPHONE DRAFT ${session.sequence}.${session.revision}\nName - ${name}\nEffect - Focus briefly on a stationary task.\nLimits - Moving targets break concentration.\nCosts - Mild mental effort.\nPractice - Read a stationary word carefully.\n${card}END DRAFT`;
}
test('native bundles fit limits and all three routes require current reviewed confirmation',async()=>{
  for(const reverse of [false,true])for(const kind of kinds){
    const f=await fixture(reverse);
    assert.ok(Object.values(f.mod.triggers).every(t=>JSON.stringify(t).length<=10000));
    f.run('phone open Workshop');
    assert.equal(f.run('phone view '+kind+' creation').effects.length,1);
    assert.equal(f.phone.workshop.awaitingConcept,true);
    const draft=f.run('A useful concentration design, with ordinary human limits.');
    assert.equal(draft.effects.length,1);assert.equal(draft.phone.workshop.status,'drafting');
    assert.equal(f.again().effects.length,0);
    f.capture(proposal(f.phone.workshop));assert.equal(f.phone.workshop.status,'review');
    const id=f.phone.workshop.sequence+'.'+f.phone.workshop.revision;
    f.reload();const submitted=f.run('phone confirm '+id);
    assert.equal(submitted.effects.length,1);assert.equal(submitted.phone.workshop.status,'requested');
    assert.match(submitted.text,/Moving targets break concentration/);
    assert.match(submitted.text,/This action only saves a design/);
    assert.ok(submitted.effects.every(e=>e.type==='story'));
    assert.equal(f.run('phone confirm '+id).text.includes('TEXTPHONE APPROVED'),false);
  }
});
test('revision, malformed output and cancellation prevent stale submission',async()=>{
  const f=await fixture();f.run('phone open Workshop');f.run('phone view skill creation');f.run('A decoding skill');
  f.capture(proposal(f.phone.workshop,'Signal Reading'));const old=f.phone.workshop.sequence+'.'+f.phone.workshop.revision;
  f.run('Restrict it to slow audio. '+ 'detail '.repeat(100));
  assert.equal(f.phone.workshop.status,'drafting');assert.match(f.phone.workshop.baseDraft.name,/Signal/);
  f.capture('A partial proposal.');f.run('phone confirm '+old);assert.equal(f.phone.workshop.approved,null);
  f.run('phone workshop cancel');assert.equal(f.phone.workshop.status,'closed');assert.equal(f.phone.workshop.draft,null);
  f.run('phone view ability creation');assert.equal(f.phone.workshop.sequence,2);
  f.run('phone confirm '+old);assert.equal(f.phone.workshop.approved,null);
});
test('ordinary navigation cancels active drafts in either trigger order',async()=>{
  for(const reverse of [false,true]){
    const f=await fixture(reverse);f.run('phone open Workshop');f.run('phone view ability creation');f.run('A short focus routine');
    f.run('phone home');assert.equal(f.phone.workshop.status,'closed');assert.equal(f.phone.screen,'home');
  }
});
test('skill context requires actual native possession and survives closing/reload',async()=>{
  const f=await fixture();f.run('phone open Workshop');f.run('phone view skill creation');f.run('A decoding skill');f.capture(proposal(f.phone.workshop,'Signal Reading'));
  f.run('phone confirm '+f.phone.workshop.sequence+'.'+f.phone.workshop.revision);f.run('phone workshop cancel');f.reload();
  assert.equal(f.run('I use Signal Reading').text.includes('already learned'),false);
  f.learn('signal reading');assert.match(f.run('I use Signal Reading').text,/already learned/);
  assert.equal(f.run('I walk home').text.includes('already learned'),false);
});
test('multiplayer input cannot start or update another player workshop',async()=>{
  const f=await fixture();f.run('phone open Workshop');f.multiplayer();f.run('phone view skill creation');assert.equal(f.phone.workshop,undefined);
});

test('workshop metadata never becomes an App Store entry',async()=>{
 const f=await fixture();
 const store=f.run('phone store');
 assert.doesNotMatch(store.text,/undefined|TextPhone Workshops/);
 assert.match(store.text,/Workshop/);
});

test('unversioned controls ask for input and never count as approval',async()=>{
 for(const reverse of [false,true]){
  const f=await fixture(reverse);f.run('phone open Workshop');f.run('phone view ability creation');
  assert.match(f.run('phone workshop confirm').text,/complete proposal/);
  f.run('A brief focus technique.');f.capture(proposal(f.phone.workshop));
  assert.match(f.run('phone workshop revise').text,/ordinary chat/);
  assert.equal(f.phone.workshop.status,'review');
  assert.match(f.run('phone workshop confirm').text,/phone confirm 1.2/);
  assert.equal(f.phone.workshop.approved,null);
 }
});

test('disabling the only workshop app omits its runtime and AI additions',async()=>{
 const config=structuredClone(base);
 config.apps.push({id:'workshop',label:'Workshop',order:10,enabled:false,pages:[{name:'Ability creation',kind:'workshop',workshopKind:'ability',guidance:''}]});
 const mod=await buildPhoneMod(config);
 assert.equal(mod.aiInstructions,undefined);
 assert.equal(Object.keys(mod.triggers).some(id=>id.includes('workshop')),false);
});

test('obsolete learning command cannot approve or practice a draft',async()=>{
 const f=await fixture();f.run('phone open Workshop');f.run('phone view skill creation');f.run('Signal interpretation');
 f.capture(proposal(f.phone.workshop,'Signal Reading'));
 assert.match(f.run('phone learn skill 1.2 Signal Reading').text,/approves nothing/);
 assert.equal(f.phone.workshop.approved,null);
});

test('one explicit practice retrieves the complete approved design across close and reload',async()=>{
 for(const reverse of [false,true])for(const kind of kinds){
  const f=await fixture(reverse);f.run('phone open Workshop');f.run('phone view '+kind+' creation');f.run('A focus design');
  f.capture(proposal(f.phone.workshop,'Quiet Focus'));
  assert.doesNotMatch(f.run('practice Quiet Focus').text,/TEXTPHONE PRACTICE/);
  const approved=f.run('phone confirm 1.2');
  assert.match(approved.text,/TEXTPHONE DESIGN SAVED/);assert.doesNotMatch(approved.text,/TEXTPHONE PRACTICE/);
  assert.equal(f.phone.workshopApprovedDesigns.length,1);
  f.run('phone workshop cancel');f.reload();
  assert.doesNotMatch(f.run('practice Quiet Focus extra').text,/TEXTPHONE PRACTICE/);
  const practice=f.run('practice quiet focus');
  assert.equal(practice.effects.length,1);assert.match(practice.text,new RegExp('TEXTPHONE PRACTICE '+kind.toUpperCase()));
  for(const field of ['Focus briefly on a stationary task.','Moving targets break concentration.','Mild mental effort.','Read a stationary word carefully.'])assert.ok(practice.text.includes(field));
  assert.equal(f.phone.screen,'closed');assert.equal(f.phone.workshop.status,'closed');
  assert.equal(f.again().effects.length,0);
  assert.ok(practice.effects.every(effect=>effect.type==='story'));
 }
});

test('practice from an open approved workshop exits without design revision in either order',async()=>{
 for(const reverse of [false,true]){
  const f=await fixture(reverse);f.run('phone open Workshop');f.run('phone view skill creation');f.run('A focus design');f.capture(proposal(f.phone.workshop));f.run('phone confirm 1.2');
  const practice=f.run('practice Quiet Focus');assert.equal(practice.effects.length,1);assert.equal(f.phone.workshop.revision,2);assert.equal(f.phone.workshop.status,'closed');
 }
});

test('duplicate names across kinds remain unapproved and malformed stored designs cannot run',async()=>{
 const f=await fixture();f.run('phone open Workshop');f.run('phone view skill creation');f.run('A focus design');f.capture(proposal(f.phone.workshop));f.run('phone confirm 1.2');f.run('phone workshop cancel');
 f.run('phone view ability creation');f.run('Another focus design');f.capture(proposal(f.phone.workshop));
 assert.match(f.run('phone confirm 2.2').text,/already saved/);assert.equal(f.phone.workshop.status,'review');
 f.phone.workshopApprovedDesigns[0].draft.costs='';
 assert.throws(()=>f.run('practice Quiet Focus'),/Invalid draft costs/);
});


test('observed narrator-expanded practice shortcut resolves the same approved design',async()=>{
 for(const reverse of [false,true]){
  const f=await fixture(reverse);f.run('phone open Workshop');f.run('phone view skill creation');f.run('A focus design');f.capture(proposal(f.phone.workshop));f.run('phone confirm 1.2');
  const practice=f.run('phone workshop practice Quiet Focus');assert.equal(practice.effects.length,1);assert.match(practice.text,/TEXTPHONE PRACTICE SKILL/);assert.equal(f.phone.workshop.status,'closed');assert.equal(f.again().effects.length,0);
 }
});

test('successive player-requested practice sessions preserve one approved design without granting it',async()=>{
 for(const reverse of [false,true])for(const kind of kinds){
  const f=await fixture(reverse);f.run('phone open Workshop');f.run('phone view '+kind+' creation');f.run('A focus design');f.capture(proposal(f.phone.workshop));f.run('phone confirm 1.2');
  const approved=structuredClone(f.phone.workshopApprovedDesigns);
  for(let session=1;session<=5;session++){
   f.reload();const practice=f.run('practice Quiet Focus');
   assert.equal(practice.effects.length,1,'one receipt per requested session '+session);
   assert.match(practice.text,/TEXTPHONE PRACTICE/);
   assert.ok(practice.effects.every(effect=>effect.type==='story'));
   assert.deepEqual(JSON.parse(JSON.stringify(f.phone.workshopApprovedDesigns)),approved);
   assert.equal(f.again().effects.length,0,'same-action reexecution remains idempotent');
  }
 }
});

test('typed skill and ability commands preserve the approved kind and reject mismatches',async()=>{
 for(const reverse of [false,true])for(const kind of kinds){
  const f=await fixture(reverse);f.run('phone open Workshop');f.run('phone view '+kind+' creation');f.run('A focus design');f.capture(proposal(f.phone.workshop));
  const type=kind==='skill'?'skill':'ability';
  assert.match(f.run('phone confirm 1.2').text,new RegExp('\\[practice '+type+' Quiet Focus\\]'));
  const wrong=f.run('practice '+(type==='skill'?'ability':'skill')+' Quiet Focus');
  assert.match(wrong.text,/TYPE MISMATCH/);assert.doesNotMatch(wrong.text,/Approved description/);assert.equal(f.phone.workshop.status,'requested');
  const practice=f.run('Practice '+type+' Quiet Focus');assert.match(practice.text,new RegExp('TEXTPHONE PRACTICE '+kind.toUpperCase()));assert.equal(practice.effects.length,1);
  assert.equal(f.phone.workshop.status,'closed');f.reload();
  const alias=f.run('phone workshop practice '+type+' Quiet Focus');assert.equal(alias.effects.length,1);assert.equal(f.again().effects.length,0);
 }
});


test('typographic draft separators survive native capture, explicit approval and typed practice',async()=>{
 for(const reverse of [false,true])for(const kind of kinds){
  const f=await fixture(reverse);
  f.run('phone open Workshop');f.run('phone view '+kind+' creation');f.run('A focus design');
  const rendered=proposal(f.phone.workshop).replace(/^(Name|Effect|Limits|Costs|Practice) -/gm,'$1 —');
  f.capture(rendered);assert.equal(f.phone.workshop.status,'review');
  f.run('phone confirm 1.2');f.reload();
  assert.equal(f.phone.workshopApprovedDesigns.length,1);
  const practice=f.run('practice '+(kind==='skill'?'skill':'ability')+' Quiet Focus');
  assert.match(practice.text,/Moving targets break concentration/);
  assert.equal(practice.effects.length,1);assert.equal(f.phone.workshop.status,'closed');
 }
});
test('bold markers and labels survive native capture, explicit approval and typed practice',async()=>{
 for(const reverse of [false,true])for(const kind of kinds){
  const f=await fixture(reverse);
  f.run('phone open Workshop');f.run('phone view '+kind+' creation');f.run('A focus design');
  const rendered=proposal(f.phone.workshop).replace(/^(TEXTPHONE DRAFT \d+\.\d+|END DRAFT)$/gm,'**$1**').replace(/^(Name|Effect|Limits|Costs|Practice|Native card) -/gm,'**$1** —');
  f.capture(rendered);assert.equal(f.phone.workshop.status,'review');
  f.run('phone confirm 1.2');f.reload();
  assert.equal(f.phone.workshopApprovedDesigns.length,1);
  const practice=f.run('practice '+(kind==='skill'?'skill':'ability')+' Quiet Focus');
  assert.match(practice.text,/Moving targets break concentration/);
  assert.equal(practice.effects.length,1);assert.equal(f.phone.workshop.status,'closed');
 }
});

test('new purchase cards require review and survive approval, reload and practice verbatim',async()=>{
 for(const reverse of [false,true])for(const kind of ['ability','technique']){
  const f=await fixture(reverse);
  f.run('phone open Workshop');f.run('phone view '+kind+' creation');
  const prompt=f.run('A concentration design');
  assert.match(prompt.text,/Native card - proposed purchase description/);
  const text=proposal(f.phone.workshop);
  f.capture(text.replace(/^Native card[^\n]*\n/m,''));
  assert.equal(f.phone.workshop.status,'drafting');
  f.run('phone confirm 1.2');assert.equal(f.phone.workshop.approved,null);
  // A new ordinary request creates a new revision after the missing-field response.
  f.run('Please include the complete purchase card.');
  f.capture(proposal(f.phone.workshop).replace('Native card -','Native card —'));
  assert.equal(f.phone.workshop.status,'review');
  const card=f.phone.workshop.draft.nativeCard;
  assert.equal(f.phone.workshop.approved,null);
  f.run('phone confirm 1.3');f.reload();
  assert.equal(f.phone.workshopApprovedDesigns[0].draft.nativeCard,card);
  const practice=f.run('practice ability Quiet Focus');
  assert.ok(practice.text.includes('Approved native card - '+card));
  assert.ok(practice.text.includes('Approved description - Focus briefly on a stationary task. Moving targets break concentration. Mild mental effort.'));
  assert.ok(practice.effects.every(effect=>effect.type==='story'));
  assert.equal(f.again().effects.length,0);
 }
});

test('legacy approved ability records keep their full original receipt without an invented card',async()=>{
 const f=await fixture();f.run('phone open Workshop');f.run('phone view ability creation');f.run('A focus design');
 delete f.phone.workshop.nativeCardRequired;
 f.capture(proposal(f.phone.workshop));f.run('phone confirm 1.2');f.reload();
 const practice=f.run('practice ability Quiet Focus');
 assert.match(practice.text,/Approved description - Focus briefly on a stationary task. Moving targets break concentration. Mild mental effort./);
 assert.doesNotMatch(practice.text,/Approved native card/);
 assert.equal(f.phone.workshopApprovedDesigns[0].draft.nativeCard,undefined);
});

test('prompt configuration stays inert and template tokens inside player input stay literal',async()=>{
 const f=await fixture();f.run('phone open Workshop');f.run('phone view ability creation');
 const prompt=f.run('Call it {revision} or $& and retain {card} as a literal motif.');
 assert.ok(prompt.text.includes('Call it {revision} or $& and retain {card} as a literal motif.'));
 assert.match(prompt.text,/TEXTPHONE DRAFT 1\.2/);
 assert.match(prompt.text,/\[phone confirm 1\.2\]/);
 const record=f.mod.triggers.phone_mod_metadata_workshop_prompt;
 assert.deepEqual(record.conditions,[{type:'game-tick',operator:'lessThan',value:0}]);
 const original=JSON.parse(JSON.stringify(f.phone.workshop));
 record.script='/* PHONE CONFIG\n{"proposal":42}\n*/';
 assert.throws(()=>f.run('Revise the concept'),/Invalid workshop prompt/);
 assert.deepEqual(JSON.parse(JSON.stringify(f.phone.workshop)),original);
});
