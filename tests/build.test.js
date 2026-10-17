import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('build grants only X and Jev hosts and has no media processing entry paths',async()=>{
 const build=await readFile('scripts/build.js','utf8');assert.doesNotMatch(build,/api\.openai\.com|pbs\.twimg\.com/);
 for(const path of ['src/background.js','src/content.js','src/api.js'])assert.doesNotMatch(await readFile(path,'utf8'),/loadMedia|sampleVideo|describeMedia|api\.openai\.com|input_image/);
});
