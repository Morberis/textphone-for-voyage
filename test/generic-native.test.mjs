import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {buildPhoneMod} from '../native/build-mod.mjs';
const base=JSON.parse(await fs.readFile(new URL('../config/generic-phone.json',import.meta.url),'utf8'));
async function fixture(configuration=base){
 const {triggers}=await buildPhoneMod(configuration);let storage={},tick=0,actor='Avery',area='lobby';const known={'Corner Cafe':true};
 const run=action=>{tick++;const effects=[];for(const trigger of Object.values(triggers).filter(row=>!row.name.startsWith('phone_mod_config_')&&!row.name.startsWith('phone_mod_data_')))
  vm.runInNewContext(trigger.script,{storage,triggers,effects,log:()=>{},check:query=>({'action-text':[action],'game-tick':tick,'player-level':{[actor]:1},'party-location':'Workshop','party-area':area,'known-entity':known[query.entity]??false}[query.type])});
  return {text:effects.map(effect=>effect.instruction).join('\n'),effects,phone:storage.phone_mod?.players[JSON.stringify(actor)]};};
 return {run,known,get storage(){return storage;},reload(){storage=JSON.parse(JSON.stringify(storage));},actor(name){actor=name;},area(name){area=name;}};
}
test('generic commands route every configured page once',async()=>{
 const enabled=structuredClone(base);enabled.apps.find(app=>app.id==='clock').enabled=true;enabled.initialInstalledIds.push('clock');const f=await fixture(enabled);for(const app of base.apps){f.run('phone open '+app.label);for(const page of app.pages){const view=f.run('phone view '+page.name);assert.equal(view.effects.length,1);assert.equal(view.phone.appId,app.id);}}
});
test('optional clock adapter reads only the configured public clock record',async()=>{
 const config=structuredClone(base);config.clockStorageKey='public_clock';config.apps.find(app=>app.id==='clock').enabled=true;config.initialInstalledIds.push('clock');const f=await fixture(config);f.storage.public_clock={date:'2040-05-03',time:'09:20'};f.run('phone open Clock');const result=f.run('phone view time');assert.match(result.text,/2040-05-03/);assert.match(result.text,/09:20/);
});
test('layout, install, remove, core protection, collision and reload',async()=>{
 const config=structuredClone(base);config.apps.push({id:'mirror',label:'Mirror',order:5,preferredShortcut:'M',pages:[]});const f=await fixture(config);
 assert.doesNotMatch(f.run('phone layout single').text,/\]   \[/);assert.match(f.run('phone layout paired').text,/\]   \[/);f.run('phone install Mirror');const shortcut=f.run('phone').phone.shortcuts.mirror;assert.notEqual(shortcut,'M');f.run('phone uninstall Messages');f.reload();assert.equal(f.run('phone').phone.shortcuts.mirror,shortcut);assert.match(f.run('phone uninstall App Store').text,/core app/);
 f.actor('明里');assert.ok(f.run('phone').phone.installedIds.includes('messages'));
});
test('store listing modes and directory back are independent',async()=>{
 for(const mode of ['known','all_public','curated']){const config=structuredClone(base),directory=config.apps.find(app=>app.id==='food').directory;directory.storeListingMode=mode;directory.curatedIds=[];const f=await fixture(config);f.known['Corner Cafe']=false;const result=f.run('phone open Food Delivery');assert.equal(result.text.includes('[1] Corner Cafe'),mode==='all_public');}
 const f=await fixture();f.run('phone open Food Delivery');assert.match(f.run('1').text,/selected business/);assert.equal(f.run('Back').phone.directory.screen,'list');assert.equal(f.run('Back').phone.screen,'home');
});
test('per-app delivery and area overrides have distinct messages',async()=>{
 const config=structuredClone(base);config.apps.find(app=>app.id==='food').delivery={blockedMessage:'Building unavailable',blockedLocations:[{locationId:'Workshop'},{locationId:'Workshop',areaId:'lobby',message:'Lobby pickup closed'}]};
 const f=await fixture(config);f.run('phone open Food Delivery');assert.match(f.run('phone delivery check').text,/Lobby pickup closed/);f.area('roof');assert.match(f.run('phone delivery check').text,/Building unavailable/);
});
test('hidden reveal is separate from install and supports generated detail requests',async()=>{
 const config=structuredClone(base);config.apps.push({id:'secret',label:'Signal Vault',order:5,appStoreVisibility:'triggered',pages:[{name:'Inbox',kind:'generated',guidance:'Show established messages.'},{name:'Request callback',kind:'generated',startsActivity:true,guidance:'Ask for a contact.'}]});const f=await fixture(config);
 assert.doesNotMatch(f.run('phone store').text,/Signal Vault/);assert.match(f.run('phone install Signal Vault').text,/unavailable/);f.storage.phone_mod_unlocks={'"Avery"':{secret:true}};assert.match(f.run('phone store').text,/Signal Vault - Available/);f.run('phone install Signal Vault');f.run('phone open Signal Vault');assert.match(f.run('phone choose request callback').text,/explicitly requested/);assert.match(f.run('phone view message one').text,/browse-only detail/);
});

test('protected custom app keeps its registry entry and puts its outcome before catalogue rows',async()=>{
 const config=structuredClone(base);config.apps.push({id:'protected_app',label:'Protected App',order:5,removable:false,pages:[]});const f=await fixture(config);
 f.run('phone install Protected App');const result=f.run('phone uninstall Protected App');
 assert.ok(result.phone.installedIds.includes('protected_app'));
 assert.ok(result.text.indexOf('Protected App is a core app and remains installed.')<result.text.indexOf('Messages - Installed'));
});
