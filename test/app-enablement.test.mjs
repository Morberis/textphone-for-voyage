import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {buildPhoneMod,validateConfiguration} from '../native/build-mod.mjs';

const profiles=[JSON.parse(await fs.readFile(new URL('../config/generic-phone.json',import.meta.url),'utf8'))];
try{profiles.push(JSON.parse(await fs.readFile(new URL('../config/your-power-phone.json',import.meta.url),'utf8')));}catch(error){if(error.code!=='ENOENT')throw error;}

async function fixture(config,storage={}){
 const {triggers}=await buildPhoneMod(config);let tick=100;
 const run=action=>{
  const effects=[];tick++;
  for(const trigger of Object.values(triggers).filter(row=>!row.script.startsWith('/* PHONE CONFIG')))
   vm.runInNewContext(trigger.script,{storage,triggers,effects,log:()=>{},check:q=>({'action-text':[action],'game-tick':tick,'player-level':{Avery:1},'party-location':'Workshop','party-area':'lobby','known-entity':true}[q.type])});
  return {text:effects.map(e=>e.instruction).join('\n'),phone:storage.phone_mod?.players['"Avery"'],effects};
 };
 return {run,triggers,storage};
}

test('every app can be disabled independently, including the protected App Store',async()=>{
 for(const profile of profiles)for(const target of profile.apps){
  const config=structuredClone(profile);for(const app of config.apps)app.enabled=true;
  config.apps.find(app=>app.id===target.id).enabled=false;
  const f=await fixture(config);const home=f.run('phone');
  assert.ok(!home.phone.installedIds.includes(target.id),target.id);
  assert.ok(!f.triggers['phone_mod_config_'+target.id]);
  assert.ok(!Object.keys(f.triggers).some(key=>key.startsWith('phone_mod_data_'+target.id+'_')));
  const catalog=f.run('phone store');
  if(target.id===config.storeAppId){assert.match(catalog.text,/App Store is disabled/);assert.doesNotMatch(home.text,/\[phone store\]/);}
  else assert.ok(!catalog.text.includes(target.label+' - '));
  f.run('phone install '+target.label);assert.ok(!f.run('phone').phone.installedIds.includes(target.id));
  assert.notEqual(f.run('phone open '+target.label).phone.appId,target.id);
 }
});

test('disabled apps cannot be restored by a story unlock grant',async()=>{
 const config=structuredClone(profiles[0]);const app=config.apps.find(a=>a.id==='messages');app.enabled=false;app.appStoreVisibility='triggered';app.unlockKnownEntity='Known place';
 const f=await fixture(config,{phone_mod_unlocks:{'"Avery"':{messages:true}}});
 f.run('phone install Messages');const result=f.run('phone');assert.ok(!result.phone.installedIds.includes('messages'));assert.ok(!result.phone.revealedIds.includes('messages'));
});

test('re-enabling retains starting-install and hidden-download choices',async()=>{
 const config=structuredClone(profiles[0]);const clock=config.apps.find(a=>a.id==='clock');clock.enabled=true;
 let f=await fixture(config);assert.ok(!f.run('phone').phone.installedIds.includes('clock'));assert.match(f.run('phone store').text,/Clock - Available/);
 clock.appStoreVisibility='triggered';f=await fixture(config);assert.doesNotMatch(f.run('phone store').text,/Clock - Available/);
 config.initialInstalledIds.push('clock');f=await fixture(config);assert.ok(f.run('phone').phone.installedIds.includes('clock'));
});

test('all apps off still supports Home, close, layout and explicit store refusal',async()=>{
 const config=structuredClone(profiles[0]);for(const app of config.apps)app.enabled=false;
 const f=await fixture(config);for(const action of ['phone','phone layout paired','phone store','phone install Clock']){const result=f.run(action);assert.equal(result.effects.length,1);assert.equal(result.phone.installedIds.length,0);}
 assert.match(f.run('close phone').text,/PHONE CLOSED/);
});

test('recompiled disabled app clears a stale active selection without changing host data',async()=>{
 const config=structuredClone(profiles[0]);const old=await fixture(config);old.run('phone open Food Delivery');old.run('1');old.storage.unrelated={preserve:7};
 config.apps.find(a=>a.id==='food').enabled=false;const f=await fixture(config,old.storage);const result=f.run('phone');assert.ok(!result.phone.installedIds.includes('food'));assert.equal(result.phone.appId,null);assert.equal(result.phone.directory,null);assert.deepEqual(f.storage.unrelated,{preserve:7});
});

test('omitted enablement stays backward compatible and invalid values fail',async()=>{
 const config=structuredClone(profiles[0]);delete config.apps[0].enabled;assert.ok((await fixture(config)).run('phone').phone.installedIds.includes(config.apps[0].id));
 for(const invalid of ['false',0,null]){config.apps[0].enabled=invalid;assert.throws(()=>validateConfiguration(config),/enabled must be boolean/);}
});
