import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {validateAppCatalog} from '../src/phone-config-validation.mjs';
import {selectAppStores} from '../src/phone-catalog-policy.mjs';
import {validateDeliveryPolicy} from '../src/phone-delivery-policy.mjs';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export function validateConfiguration(config) {
  if(!config||config.schemaVersion!==1||!Array.isArray(config.apps)||config.apps.length>32)throw Error('Unsupported phone configuration');
  validateAppCatalog(config.apps);
  if(typeof config.columns!=='boolean')throw Error('columns must be true or false');
  if(config.clockStorageKey!==undefined&&(typeof config.clockStorageKey!=='string'||!config.clockStorageKey.trim()||config.clockStorageKey.length>160||/[\u0000-\u001f\u007f]/.test(config.clockStorageKey)))throw Error('Invalid clock storage key');
  if(!Array.isArray(config.initialInstalledIds)||new Set(config.initialInstalledIds).size!==config.initialInstalledIds.length||config.initialInstalledIds.some(id=>!config.apps.some(app=>app.id===id)))throw Error('Invalid initial apps');
  const store=config.apps.find(app=>app.id===config.storeAppId);
  if(!store)throw Error('Unknown App Store ID');
  if(store.enabled!==false&&!config.initialInstalledIds.includes(config.storeAppId))throw Error('Enabled App Store must start installed');
  const orders=new Set();
  for(const app of config.apps){
    if(app.enabled!==undefined&&typeof app.enabled!=='boolean')throw Error('enabled must be boolean');
    if(!Number.isInteger(app.order)||orders.has(app.order))throw Error('App order must be unique');orders.add(app.order);
    if(app.preferredShortcut!==undefined&&!/^[A-Z0-9]$/.test(app.preferredShortcut))throw Error('Shortcut must be one uppercase letter or digit');
    if(app.appStoreVisibility!==undefined&&!['public','triggered'].includes(app.appStoreVisibility))throw Error('Unknown visibility');
    if(app.removable!==undefined&&typeof app.removable!=='boolean')throw Error('removable must be boolean');
    if(app.unlockKnownEntity!==undefined&&(typeof app.unlockKnownEntity!=='string'||!app.unlockKnownEntity))throw Error('Invalid unlock entity');
    if(app.summary!==undefined&&(typeof app.summary!=='string'||app.summary.length>160||/[\r\n]/.test(app.summary)))throw Error('App summary must be one short line');
    if(typeof(app.guidance||'')!=='string'||(app.guidance||'').length>1800)throw Error('App guidance exceeds limit');
    if(!Array.isArray(app.pages)||app.pages.length>12)throw Error('Invalid pages');
    const names=new Set();
    for(const page of app.pages){
      if(!/^[A-Za-z][A-Za-z -]{0,39}$/.test(page.name)||names.has(page.name.toLowerCase()))throw Error('Invalid or duplicate page name');names.add(page.name.toLowerCase());
      if(!['generated','directory'].includes(page.kind)||typeof page.guidance!=='string'||page.guidance.length>1800)throw Error('Invalid page kind or guidance');
      if(page.startsActivity!==undefined&&typeof page.startsActivity!=='boolean')throw Error('Invalid activity flag');
      if(page.kind==='directory'&&(page.startsActivity||!app.directory))throw Error('Directory requires configuration and is browse-only');
      if(page.contextReader!==undefined&&!['location','clock'].includes(page.contextReader))throw Error('Unknown context reader');
    }
    if(app.openPage&&!app.pages.some(page=>page.name===app.openPage&&!page.startsActivity))throw Error('Opening cannot start an activity');
    if(app.directory){
      if(app.directory.storeListingMode==='visited')throw Error('Native visited reader is not supported; use known');
      selectAppStores(app.directory,app.directory.entries,{});
      if(app.directory.entries.length>128)throw Error('Native directory exceeds128 entries');
      if(!['heading','contentLabel','currency'].every(key=>typeof app.directory[key]==='string'&&app.directory[key].length>0&&app.directory[key].length<100))throw Error('Invalid directory labels');
      const labels=new Set();
      for(const entry of app.directory.entries){
        if(typeof entry.label!=='string'||!entry.label||entry.label.length>96||labels.has(entry.label.toLowerCase())||typeof entry.locationId!=='string'||!entry.locationId||typeof entry.description!=='string'||entry.description.length>1200)throw Error('Invalid business entry');
        labels.add(entry.label.toLowerCase());
      }
      if(app.directory.storeListingMode==='curated'&&app.directory.curatedIds.some(id=>!app.directory.entries.some(entry=>entry.id===id)))throw Error('Unknown curated business');
    }
    if(app.delivery)validateDeliveryPolicy(app.delivery);
  }
  return config;
}

export async function buildPhoneMod(config) {
  validateConfiguration(config);
  const source=async name=>(await fs.readFile(path.join(root,'src',name),'utf8')).replace(/^export /gm,'');
  const common=await source('mod-context.mjs');
  const records={};
  const trigger=(name,script,conditions)=>({name,script,scope:'party',phase:'planning',recurring:true,conditions,effects:[]});
  const inert=[{type:'game-tick',operator:'lessThan',value:0}];
  const configRecord=(id,value)=>{records[id]=trigger(id,'/* PHONE CONFIG\n'+JSON.stringify(value,null,2)+'\n*/',inert);};
  const {apps:catalog,...settings}=config;
  const apps=catalog.filter(app=>app.enabled!==false);
  settings.initialInstalledIds=settings.initialInstalledIds.filter(id=>apps.some(app=>app.id===id));
  if(!apps.some(app=>app.id===settings.storeAppId))settings.storeAppId=null;
  configRecord('phone_mod_config_settings',settings);
  for(const original of apps){
    const app=structuredClone(original);delete app.enabled;
    if(app.directory){
      const entries=app.directory.entries;app.directory.entries=[];app.directory.entryRecords=[];
      for(let offset=0;offset<entries.length;offset+=6){
        const id='phone_mod_data_'+app.id+'_'+Math.floor(offset/6);
        configRecord(id,entries.slice(offset,offset+6));app.directory.entryRecords.push(id);
      }
    }
    configRecord('phone_mod_config_'+app.id,app);
  }
  const handlers=[['home','handlePhoneHome',[]],['marketplace','handlePhoneMarketplace',[]],['services','handlePhoneServices',[]],['directory','handlePhoneDirectory',[]],['delivery','handlePhoneDelivery',['phone-delivery-policy.mjs']],['follow-through','handlePhoneFollowThrough',[]]];
  for(const [name,handler,dependencies] of handlers){
    const code=[common,...await Promise.all(dependencies.map(source)),await source('mod-'+name+'.mjs'),handler+'(createPhoneContext(storage,triggers,check),storage,effects,log);'].join('\n');
    const compact=code.split('\n').filter(line=>!line.trim().startsWith('//')).map(line=>line.trim()).filter(Boolean).join('\n');
    records['phone_mod_'+name]=trigger('phone_mod_'+name,compact,[{type:'action-text',operator:'regex',value:'\\S'}]);
  }
  for(const record of Object.values(records)){
    new vm.Script(record.script);
    if(JSON.stringify(record).length>10000)throw Error(record.name+' exceeds10000characters: '+JSON.stringify(record).length);
  }
  return {triggers:records};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const configPath=process.argv[2];
  const outputPath=process.argv[3];
  if(!configPath||!outputPath)throw Error('Usage: node native/build-mod.mjs configuration.json output-mod.json');
  const artifact=await buildPhoneMod(JSON.parse(await fs.readFile(configPath,'utf8')));
  await fs.mkdir(path.dirname(outputPath),{recursive:true});
  await fs.writeFile(outputPath,JSON.stringify(artifact,null,2)+'\n');
  console.log(JSON.stringify({output:outputPath,triggers:Object.keys(artifact.triggers).length,sizes:Object.fromEntries(Object.entries(artifact.triggers).map(([key,value])=>[key,JSON.stringify(value).length]))},null,2));
}
