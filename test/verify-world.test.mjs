import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
for (const changed of [false,true]) test('saved-world comparison '+(changed?'rejects a changed value':'ignores formatting and key order'),async()=>{
 const folder=await mkdtemp(join(tmpdir(),'textphone-readback-'));
 try {
  const prepared=join(folder,'prepared.json'),saved=join(folder,'saved.json');
  await writeFile(prepared,JSON.stringify({locations:{lobby:{}},triggers:{example:{name:'example'}},storyStarts:{}}));
  await writeFile(saved,JSON.stringify({storyStarts:{},triggers:{example:{name:changed?'changed':'example'}},locations:{lobby:{}}},null,2));
  const result=spawnSync(process.execPath,['native/verify-world.mjs',prepared,saved],{encoding:'utf8'});
  assert.equal(result.status,changed?1:0);
  assert.match(changed?result.stderr:result.stdout,changed?/Mismatch/:/PASS/);
 } finally {await rm(folder,{recursive:true,force:true});}
});
