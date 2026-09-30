// Pure complete-export merger. Does not execute imported scripts or modify its inputs.
const ownedPrefix='phone_mod_';
const isRecord=record=>record!==null&&typeof record==='object'&&!Array.isArray(record);

export function mergePhoneWorld(originalWorld,phoneMod,narratorBridge) {
  if(!isRecord(originalWorld)||!isRecord(originalWorld.locations)||!isRecord(originalWorld.storyStarts)||!isRecord(originalWorld.triggers))
    throw Error('Choose a complete world export with locations, storyStarts and triggers.');
  if(originalWorld.engineState||originalWorld.turnData||originalWorld.triggerWritable)
    throw Error('This is a game save. Choose the world definition exported from Studio.');
  if(!isRecord(phoneMod)||Object.keys(phoneMod).some(key=>key!=='triggers')||!isRecord(phoneMod.triggers))
    throw Error('The phone mod must contain only its trigger collection.');
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
  if(preparedWorld.aiInstructions.generateStory!==undefined&&!isRecord(preparedWorld.aiInstructions.generateStory))throw Error('Unexpected Story instructions format.');
  preparedWorld.aiInstructions.generateStory??={};
  const narratorKey='How to Use the Narrator';
  const previousNarrator=preparedWorld.aiInstructions.generateStory[narratorKey]??'';
  if(typeof previousNarrator!=='string')throw Error('Unexpected narrator section format.');
  if(previousNarrator.startsWith('Phone interface:')&&!previousNarrator.startsWith(narratorBridge))
    throw Error('A different phone narrator bridge already exists. Review that section before merging.');
  preparedWorld.aiInstructions.generateStory[narratorKey]=previousNarrator.startsWith(narratorBridge)?previousNarrator:narratorBridge+previousNarrator;
  const removedIds=Object.keys(preparedWorld.triggers).filter(id=>id.startsWith(ownedPrefix));
  preparedWorld.triggers={...Object.fromEntries(Object.entries(preparedWorld.triggers).filter(([id])=>!id.startsWith(ownedPrefix))),...structuredClone(phoneMod.triggers)};
  return {world:preparedWorld,report:{replacedPhoneRecords:removedIds.length,installedPhoneRecords:incomingEntries.length,preservedHostTriggers:Object.keys(originalWorld.triggers).length-removedIds.length,locations:Object.keys(originalWorld.locations).length,storyStarts:Object.keys(originalWorld.storyStarts).length,changes:['triggers/phone_mod_*','aiInstructions/generateStory/How to Use the Narrator prefix'],existingSavesChanged:false}};
}
