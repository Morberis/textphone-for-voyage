import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {mergePhoneWorld} from '../src/merge-phone-world.mjs';
import {buildPhoneMod} from '../native/build-mod.mjs';
const releaseConfig=JSON.parse(await fs.readFile(new URL('../config/generic-phone.json',import.meta.url),'utf8'));
const coreConfig=structuredClone(releaseConfig);
coreConfig.apps=coreConfig.apps.filter(app=>!app.pages.some(page=>page.kind==='workshop'));
coreConfig.initialInstalledIds=coreConfig.initialInstalledIds.filter(id=>coreConfig.apps.some(app=>app.id===id));
const mod=await buildPhoneMod(coreConfig);
const bridge=await fs.readFile(new URL('../narrator-bridge.txt',import.meta.url),'utf8');
const world={heroesVersion:36,locations:{'Workshop':{name:'Workshop',known:true}},storyStarts:{'Quiet morning':{description:'Start in the workshop.'}},triggers:{host_rule:{name:'host_rule',script:'// Preserve host code'}},aiInstructions:{generateStory:{'How to Use the Narrator':'Host narration rules.','Other rule':'Retain this'},otherEngine:{keep:'Retain this too'}},quests:{project:{name:'Finish the model'}},unknownFutureField:{unicode:'明里'}};
test('complete merge preserves every unrelated host field and input',()=>{
 const before=structuredClone(world),prepared=mergePhoneWorld(world,mod,bridge);
 assert.deepEqual(world,before);assert.deepEqual(prepared.world.locations,world.locations);assert.deepEqual(prepared.world.quests,world.quests);assert.deepEqual(prepared.world.unknownFutureField,world.unknownFutureField);
 const restored=structuredClone(prepared.world);restored.triggers=Object.fromEntries(Object.entries(restored.triggers).filter(([key])=>!key.startsWith('phone_mod_')));restored.aiInstructions.generateStory['How to Use the Narrator']=restored.aiInstructions.generateStory['How to Use the Narrator'].slice(bridge.length);assert.deepEqual(restored,world);
 assert.deepEqual(mergePhoneWorld(prepared.world,mod,bridge).world,prepared.world);
});
test('changing profiles removes obsolete owned records and preserves host rules',()=>{
 const previous=structuredClone(world);previous.triggers.phone_mod_old_app={name:'phone_mod_old_app',script:'// Old phone app'};
 const prepared=mergePhoneWorld(previous,mod,bridge);assert.equal(prepared.world.triggers.phone_mod_old_app,undefined);assert.deepEqual(prepared.world.triggers.host_rule,world.triggers.host_rule);
});
test('rejects saves, partial worlds, unrelated patches and conflicting narrator bridges',()=>{
 assert.throws(()=>mergePhoneWorld({...world,turnData:{}},mod,bridge),/game save/);
 assert.throws(()=>mergePhoneWorld({triggers:{}},mod,bridge),/complete world/);
 assert.throws(()=>mergePhoneWorld(world,{...mod,locations:{}},bridge),/only/);
 const conflict=structuredClone(world);conflict.aiInstructions.generateStory['How to Use the Narrator']='Phone interface: older integration';assert.throws(()=>mergePhoneWorld(conflict,mod,bridge),/different phone/);
});

test('workshop install, upgrade and removal preserve unrelated host instructions',async()=>{
 const config=structuredClone(coreConfig);
 config.apps.push({id:'workshop',label:'Workshop',order:10,pages:[{name:'Ability creation',kind:'workshop',workshopKind:'ability',guidance:''}]});
 const workshopMod=await buildPhoneMod(config);
 const host=structuredClone(world);host.aiInstructions.generateLearnedAbilities={custom:'Host learning policy.'};
 const installed=mergePhoneWorld(host,workshopMod,bridge).world;
 assert.equal(installed.aiInstructions.generateLearnedAbilities.custom,'Host learning policy.'+workshopMod.aiInstructions.generateLearnedAbilities.custom);
 assert.deepEqual(mergePhoneWorld(installed,workshopMod,bridge).world,installed);
 const upgraded=structuredClone(workshopMod);
 upgraded.aiInstructions.generateStory['TextPhone Workshops']=upgraded.aiInstructions.generateStory['TextPhone Workshops'].replace('\n[/TextPhone Workshops]',' New edition.\n[/TextPhone Workshops]');
 upgraded.aiInstructions.generateLearnedAbilities.custom=upgraded.aiInstructions.generateLearnedAbilities.custom.replace('\n[/TextPhone Workshops]',' New edition.\n[/TextPhone Workshops]');
 upgraded.triggers.phone_mod_metadata_workshop_bridges.script='/* PHONE CONFIG\n'+JSON.stringify({aiInstructions:upgraded.aiInstructions})+'\n*/';
 const updated=mergePhoneWorld(installed,upgraded,bridge).world;
 assert.equal(updated.aiInstructions.generateStory['TextPhone Workshops'],upgraded.aiInstructions.generateStory['TextPhone Workshops']);
 assert.equal(updated.aiInstructions.generateLearnedAbilities.custom,'Host learning policy.'+upgraded.aiInstructions.generateLearnedAbilities.custom);
 const removed=mergePhoneWorld(updated,mod,bridge).world;
 assert.equal(removed.aiInstructions.generateStory['TextPhone Workshops'],undefined);
 assert.equal(removed.aiInstructions.generateLearnedAbilities.custom,'Host learning policy.');
 assert.deepEqual(removed.locations,world.locations);
 const edited=structuredClone(installed);edited.aiInstructions.generateStory['TextPhone Workshops']=edited.aiInstructions.generateStory['TextPhone Workshops'].replace('phone screen','Creator edit.');
 assert.throws(()=>mergePhoneWorld(edited,upgraded,bridge),/Review your edited/);
 assert.throws(()=>mergePhoneWorld(edited,mod,bridge),/Review your edited/);
 assert.equal(edited.aiInstructions.generateStory['TextPhone Workshops'].includes('Creator edit.'),true);
 const unrelated=structuredClone(workshopMod);unrelated.aiInstructions.generateStory.other='Replace host';
 assert.throws(()=>mergePhoneWorld(world,unrelated,bridge),/only its three/);
 const mismatch=structuredClone(workshopMod);mismatch.aiInstructions.generateStory['TextPhone Workshops']=mismatch.aiInstructions.generateStory['TextPhone Workshops'].replace('phone screen','Different');
 assert.throws(()=>mergePhoneWorld(world,mismatch,bridge),/does not match/);
 const customEdit=structuredClone(installed);customEdit.aiInstructions.generateLearnedAbilities.custom=customEdit.aiInstructions.generateLearnedAbilities.custom.replace('full Approved description','edited description');
 assert.throws(()=>mergePhoneWorld(customEdit,upgraded,bridge),/Review your edited/);
 assert.throws(()=>mergePhoneWorld(customEdit,mod,bridge),/Review your edited/);
 const hostExtension=structuredClone(installed);hostExtension.aiInstructions.generateLearnedAbilities.custom+='\nHost afterword.';
 const extended=mergePhoneWorld(hostExtension,upgraded,bridge).world;
 assert.equal(extended.aiInstructions.generateLearnedAbilities.custom,'Host learning policy.'+upgraded.aiInstructions.generateLearnedAbilities.custom+'\nHost afterword.');
 assert.equal(mergePhoneWorld(extended,mod,bridge).world.aiInstructions.generateLearnedAbilities.custom,'Host learning policy.\nHost afterword.');
});


test('Story section preserves long host custom; merged custom overflow fails before mutation',async()=>{
 const config=structuredClone(coreConfig);
 config.apps.push({id:'workshop',label:'Workshop',order:10,pages:[{name:'Ability creation',kind:'workshop',workshopKind:'ability',guidance:''}]});
 const workshopMod=await buildPhoneMod(config),host=structuredClone(world);
 host.aiInstructions.generateStory.custom='Host.'.repeat(999);
 const installed=mergePhoneWorld(host,workshopMod,bridge).world;
 assert.equal(installed.aiInstructions.generateStory.custom,host.aiInstructions.generateStory.custom);
 assert.ok(installed.aiInstructions.generateStory['TextPhone Workshops'].length<5000);
 host.aiInstructions.generateLearnedAbilities={custom:'Host.'.repeat(999)};
 const before=structuredClone(host);
 assert.throws(()=>mergePhoneWorld(host,workshopMod,bridge),/exceeds 5000/);
 assert.deepEqual(host,before);
});


test('distributed generic profile includes the workshop and retains creator learning policy',async()=>{
 const built=JSON.parse(await fs.readFile(new URL('../build/generic-phone-mod.json',import.meta.url),'utf8'));
 assert.deepEqual(built,await buildPhoneMod(releaseConfig));
 assert.ok(releaseConfig.apps.some(app=>app.id==='workshop'&&app.pages.some(page=>page.workshopKind==='skill')));
 const host=structuredClone(world);host.aiInstructions.generateLearnedAbilities={custom:'Creator policy: use established costs.'};
 const installed=mergePhoneWorld(host,built,bridge).world;
 assert.equal(installed.aiInstructions.generateLearnedAbilities.custom,'Creator policy: use established costs.'+built.aiInstructions.generateLearnedAbilities.custom);
 assert.deepEqual(installed.quests,host.quests);assert.deepEqual(installed.unknownFutureField,host.unknownFutureField);
 assert.deepEqual(mergePhoneWorld(installed,built,bridge).world,installed);
});


test('native named interface survives fallback upgrade without duplicate legacy prefix',()=>{
 const native=structuredClone(world);
 native.aiInstructions.generateStory['TextPhone Interface']=bridge.trim().replace('The brevity, repetition and progressive-disclosure rules below','The world’s brevity, repetition and progressive-disclosure rules');
 const updated=mergePhoneWorld(native,mod,bridge).world;
 assert.equal(updated.aiInstructions.generateStory['How to Use the Narrator'],'Host narration rules.');
 assert.equal(updated.aiInstructions.generateStory['TextPhone Interface'],native.aiInstructions.generateStory['TextPhone Interface']);
 const duplicate=structuredClone(native);duplicate.aiInstructions.generateStory['How to Use the Narrator']=bridge+'Host narration rules.';
 assert.equal(mergePhoneWorld(duplicate,mod,bridge).world.aiInstructions.generateStory['How to Use the Narrator'],'Host narration rules.');
 const edited=structuredClone(native);edited.aiInstructions.generateStory['TextPhone Interface']+=' Creator edit.';
 assert.throws(()=>mergePhoneWorld(edited,mod,bridge),/Review your edited/);
});
