import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('build grants only X and Jev hosts and has no media processing entry paths',async()=>{
 const build=await readFile('scripts/build.js','utf8');assert.doesNotMatch(build,/api\.openai\.com|pbs\.twimg\.com/);
 for(const path of ['src/background.js','src/content.js','src/api.js'])assert.doesNotMatch(await readFile(path,'utf8'),/loadMedia|sampleVideo|describeMedia|api\.openai\.com|input_image/);
});
test('store builds include correctly sized icons without broadening permissions',async()=>{
 await import('../scripts/build.js');
 for(const browser of ['chrome','firefox']){
  const manifest=JSON.parse(await readFile(`dist/${browser}/manifest.json`,'utf8'));
  assert.equal(manifest.homepage_url,'https://github.com/komagata/nagi-feed');
  assert.deepEqual(manifest.host_permissions,['https://x.com/*','https://twitter.com/*','https://api.typesafe.ai/*']);
  assert.deepEqual(manifest.permissions,['storage']);
  assert.equal(manifest.update_url,undefined);assert.equal(manifest.key,undefined);
  for(const size of [16,32,48,128]){
   const name=`icon-${size}.png`;assert.equal(manifest.icons[size],name);assert.equal(manifest.action.default_icon[size],name);
   const icon=await readFile(`dist/${browser}/${name}`);
   assert.equal(icon.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
   assert.equal(icon.readUInt32BE(16),size);assert.equal(icon.readUInt32BE(20),size);
   assert.deepEqual(icon,await readFile(`assets/icons/${name}`));
  }
 }
});
