import test from 'node:test';
import assert from 'node:assert/strict';
import {nagiStatus} from '../src/nagi-status.js';
test('waiting, processing and completed decisions have distinct visible labels',()=>{
 assert.match(nagiStatus({status:'pending'}).text,/Queued/);
 assert.equal(nagiStatus({status:'processing'}).busy,true);
 assert.match(nagiStatus({status:'allowed'}).text,/Checked.*No matches/);
 assert.match(nagiStatus({status:'excluded'}).text,/Checked.*Filtered/);
});
test('uncertainty and incomplete text never claim a complete clean decision',()=>{
 for(const result of [{status:'allowed',uncertain:true},{status:'incomplete'}])assert.match(nagiStatus(result).text,/Partially checked/);
 const error=nagiStatus({status:'error',error:'Jev API key is required.'});
 assert.match(error.text,/Could not check/);assert.match(error.detail,/API key/);assert.equal(error.busy,false);
});
test('missing API keys explain setup with an action, other failures remain distinct',()=>{
 const missing=nagiStatus({status:'error',code:'missing_jev_key',error:'Jev API key is required.'});
 assert.match(missing.text,/API key not configured/);assert.equal(missing.setup,true);
 assert.equal(nagiStatus({status:'allowed',requiredKey:'openai',mediaWarnings:['legacy warning']}).complete,true);
 assert.equal(nagiStatus({status:'error',error:'接続失敗'}).setup,undefined);
});
