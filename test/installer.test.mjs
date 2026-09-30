// Synthetic DOM event checks, not a live-browser rendering test.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
for(const profile of ['generic'])test(profile+' installer validates input and prepares complete JSON without network calls',async()=>{
 const html=await fs.readFile(new URL('../build/'+profile+'-phone-installer.html',import.meta.url),'utf8');
 assert.doesNotMatch(html,/<script[^>]+src=|fetch\(|XMLHttpRequest|https?:\/\//);
 const controls={};const document={getElementById:id=>controls[id]??=( {disabled:true,value:'',textContent:'',files:[],events:{},addEventListener(name,fn){this.events[name]=fn;},focus(){},select(){}})};
 vm.runInNewContext(html.match(/<script>([\s\S]*)<\/script>/)[1],{document,structuredClone});
 const original={heroesVersion:36,locations:{Workshop:{name:'Workshop'}},storyStarts:{Morning:{description:'Begin at home.'}},triggers:{host:{name:'host',script:'// Preserve me'}},aiInstructions:{generateStory:{'How to Use the Narrator':'Keep established world facts.'}},sentinel:{keep:['all','unknown','fields']}};
 controls.worldFile.files=[{name:'original.json',size:100,text:async()=>JSON.stringify(original)}];await controls.worldFile.events.change();assert.equal(controls.prepare.disabled,false);controls.prepare.events.click();
 const prepared=JSON.parse(controls.preparedJson.value);assert.deepEqual(prepared.sentinel,original.sentinel);assert.deepEqual(prepared.triggers.host,original.triggers.host);assert.equal(Object.keys(prepared.triggers).length,profile==='generic'?13:23);assert.equal(controls.download.disabled,false);assert.match(controls.result.textContent,/original file and live world have not changed/);
 controls.worldFile.files=[{name:'save.json',size:100,text:async()=>JSON.stringify({...original,engineState:{ticks:5}})}];await controls.worldFile.events.change();controls.prepare.events.click();assert.match(controls.result.textContent,/game save/);assert.equal(controls.download.disabled,true);
});
