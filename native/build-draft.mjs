import fs from 'node:fs/promises';
import path from 'node:path';
const [patchPath,outputPath]=process.argv.slice(2);
if(!patchPath||!outputPath)throw Error('Usage: node native/build-draft.mjs PHONE-MOD.json COMPLETE-MOD-DRAFT.json');
if(path.resolve(patchPath)===path.resolve(outputPath))throw Error('Keep the partial build and complete draft separate.');
const patch=JSON.parse(await fs.readFile(patchPath,'utf8'));
if(!patch.triggers||!patch.triggers.phone_mod_home||Object.keys(patch).some(k=>!['triggers','aiInstructions'].includes(k)))throw Error('Expected a built TextPhone patch.');
const draft=JSON.parse(await fs.readFile(new URL('./voyage-draft-base.json',import.meta.url),'utf8'));
for(const [id,record] of Object.entries(patch.triggers)){if(!id.startsWith('phone_mod_')||record.name!==id||JSON.stringify(record).length>10000)throw Error('Invalid TextPhone record: '+id);}
draft.triggers={...draft.triggers,...patch.triggers};
const bridge=await fs.readFile(new URL('./narrator-interface.txt',import.meta.url),'utf8');
draft.aiInstructions.generateStory['TextPhone Interface']=bridge;
for(const [task,fields] of Object.entries(patch.aiInstructions||{}))draft.aiInstructions[task]={...draft.aiInstructions[task],...fields};
await fs.writeFile(outputPath,JSON.stringify(draft,null,2)+'\n');
console.log('Built complete native Mod draft. Install into a Mod, never a populated World.');
