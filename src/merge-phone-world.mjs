// Pure complete-export merger. Does not execute imported scripts or modify its inputs.
const ownedPrefix='phone_mod_';
const isRecord=record=>record!==null&&typeof record==='object'&&!Array.isArray(record);
const workshopTasks=['generateActionInfo','generateStory','generateLearnedAbilities'];
const workshopManifest='phone_mod_metadata_workshop_bridges';

function validateWorkshopInstructions(instructions) {
  if(!isRecord(instructions)||Object.keys(instructions).length!==workshopTasks.length)throw Error('The phone mod may contain only its three owned workshop instruction blocks.');
  for(const task of workshopTasks){
    const sections=instructions[task];
    if(!isRecord(sections)||Object.keys(sections).length!==1)throw Error('The phone mod may contain only its three owned workshop instruction blocks.');
    const [key,block]=Object.entries(sections)[0];
    if(!(key==='custom'||task==='generateStory'&&key==='TextPhone Workshops')||typeof block!=='string'||block.length>3000)throw Error('The phone mod may contain only its three owned workshop instruction blocks.');
    if(!block.startsWith('\n\n[TextPhone Workshops]\n')||!block.endsWith('\n[/TextPhone Workshops]'))throw Error('Missing workshop custom-block delimiters.');
  }
  return instructions;
}

function readWorkshopManifest(triggers) {
  const record=triggers[workshopManifest];
  if(!record)return null;
  const script=record.script;
  if(typeof script!=='string'||!script.startsWith('/* PHONE CONFIG\n')||!script.endsWith('\n*/'))throw Error('Invalid workshop instruction manifest.');
  return validateWorkshopInstructions(JSON.parse(script.slice(16,-3)).aiInstructions);
}

export function mergePhoneWorld(originalWorld,phoneMod,narratorBridge) {
  if(!isRecord(originalWorld)||!isRecord(originalWorld.locations)||!isRecord(originalWorld.storyStarts)||!isRecord(originalWorld.triggers))
    throw Error('Choose a complete world export with locations, storyStarts and triggers.');
  if(originalWorld.engineState||originalWorld.turnData||originalWorld.triggerWritable)
    throw Error('This is a game save. Choose the world definition exported from Studio.');
  if(!isRecord(phoneMod)||Object.keys(phoneMod).some(key=>!['triggers','aiInstructions'].includes(key))||!isRecord(phoneMod.triggers))
    throw Error('The phone mod must contain only its triggers and optional workshop instructions.');
  const incomingEntries=Object.entries(phoneMod.triggers);
  if(!incomingEntries.length||!phoneMod.triggers.phone_mod_config_settings||!phoneMod.triggers.phone_mod_home)
    throw Error('The phone mod is incomplete.');
  for(const [id,trigger] of incomingEntries)
    if(!id.startsWith(ownedPrefix)||!isRecord(trigger)||trigger.name!==id||typeof trigger.script!=='string'||JSON.stringify(trigger).length>10000)
      throw Error('Invalid phone trigger: '+id);
  if(typeof narratorBridge!=='string'||!narratorBridge.startsWith('Phone interface:')||!narratorBridge.trim())
    throw Error('The narrator bridge is missing.');
  const preparedWorld=structuredClone(originalWorld);
  if(preparedWorld.aiInstructions!==undefined&&!isRecord(preparedWorld.aiInstructions))throw Error('Unexpected AI instructions format.');
  preparedWorld.aiInstructions??={};
  const incomingWorkshop=phoneMod.aiInstructions===undefined?null:validateWorkshopInstructions(phoneMod.aiInstructions);
  const incomingManifest=readWorkshopManifest(phoneMod.triggers);
  if(Boolean(incomingManifest)!==Boolean(incomingWorkshop)||incomingWorkshop&&workshopTasks.some(task=>JSON.stringify(incomingManifest[task])!==JSON.stringify(incomingWorkshop[task])))
    throw Error('Workshop instruction manifest does not match the mod.');
  const previousWorkshop=readWorkshopManifest(originalWorld.triggers);
  const workshopChanges=[];
  for(const task of workshopTasks){
    const taskInstructions=preparedWorld.aiInstructions[task];
    if(taskInstructions!==undefined&&!isRecord(taskInstructions))throw Error('Unexpected '+task+' instructions format.');
    const [oldKey,oldBlock]=Object.entries(previousWorkshop?.[task]||{})[0]||[];
    const [newKey,newBlock]=Object.entries(incomingWorkshop?.[task]||{})[0]||[];
    for(const key of new Set([oldKey,newKey,'custom',...(task==='generateStory'?['TextPhone Workshops']:[])].filter(Boolean))){
      const host=taskInstructions?.[key]??'';
      if(typeof host!=='string')throw Error('Unexpected '+task+'/'+key+' format.');
      const matched=[key===oldKey?oldBlock:null,key===newKey?newBlock:null].find(block=>block&&host.includes(block));
      if(matched&&host.split(matched).length!==2)throw Error('Duplicate TextPhone workshop custom block.');
      const remainder=matched?host.replace(matched,''):host;
      if(remainder.includes('[TextPhone Workshops]')||remainder.includes('[/TextPhone Workshops]')||key==='TextPhone Workshops'&&remainder.trim())throw Error('Review your edited '+task+'/TextPhone Workshops block before upgrading.');
      if(key===newKey||matched){
        preparedWorld.aiInstructions[task]??={};
        const replacement=key===newKey?newBlock:'';
        const composed=matched?host.replace(matched,replacement):host+replacement;
        if(composed.length>5000)throw Error('Merged AI instruction '+task+'/'+key+' exceeds 5000 characters; preserve host guidance and review the integration.');
        if(key==='TextPhone Workshops'&&!composed)delete preparedWorld.aiInstructions[task][key];
        else preparedWorld.aiInstructions[task][key]=composed;
        workshopChanges.push('aiInstructions/'+task+'/'+key+' TextPhone Workshops block');
      }
    }
  }
  if(preparedWorld.aiInstructions.generateStory!==undefined&&!isRecord(preparedWorld.aiInstructions.generateStory))throw Error('Unexpected Story instructions format.');
  preparedWorld.aiInstructions.generateStory??={};
  const narratorKey='How to Use the Narrator';
  const previousNarrator=preparedWorld.aiInstructions.generateStory[narratorKey]??'';
  if(typeof previousNarrator!=='string')throw Error('Unexpected narrator section format.');
  if(previousNarrator.startsWith('Phone interface:')&&!previousNarrator.startsWith(narratorBridge))
    throw Error('A different phone narrator bridge already exists. Review that section before merging.');
  const namedBridge=preparedWorld.aiInstructions.generateStory['TextPhone Interface'];
  const nativeBridge=narratorBridge.trim().replace('The brevity, repetition and progressive-disclosure rules below','The world’s brevity, repetition and progressive-disclosure rules');
  if(namedBridge!==undefined){
    if(typeof namedBridge!=='string'||namedBridge!==nativeBridge)throw Error('Review your edited TextPhone Interface section before upgrading.');
    // Native installation already supplies this instruction. Strip only our exact
    // legacy prefix if both routes were previously used; preserve every host byte.
    preparedWorld.aiInstructions.generateStory[narratorKey]=previousNarrator.startsWith(narratorBridge)?previousNarrator.slice(narratorBridge.length):previousNarrator;
  }else preparedWorld.aiInstructions.generateStory[narratorKey]=previousNarrator.startsWith(narratorBridge)?previousNarrator:narratorBridge+previousNarrator;
  if(preparedWorld.aiInstructions.generateStory[narratorKey].length>5000)throw Error('Merged narrator guidance exceeds 5000 characters.');
  const removedIds=Object.keys(preparedWorld.triggers).filter(id=>id.startsWith(ownedPrefix));
  preparedWorld.triggers={...Object.fromEntries(Object.entries(preparedWorld.triggers).filter(([id])=>!id.startsWith(ownedPrefix))),...structuredClone(phoneMod.triggers)};
  return {world:preparedWorld,report:{replacedPhoneRecords:removedIds.length,installedPhoneRecords:incomingEntries.length,preservedHostTriggers:Object.keys(originalWorld.triggers).length-removedIds.length,locations:Object.keys(originalWorld.locations).length,storyStarts:Object.keys(originalWorld.storyStarts).length,changes:['triggers/phone_mod_*','aiInstructions/generateStory/How to Use the Narrator prefix',...workshopChanges],existingSavesChanged:false}};
}
