import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {mergePhoneWorld} from '../src/merge-phone-world.mjs';
const mod=JSON.parse(await fs.readFile(new URL('../build/generic-phone-mod.json',import.meta.url),'utf8'));
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
