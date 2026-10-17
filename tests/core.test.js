import test from 'node:test';
import assert from 'node:assert/strict';
const core = await import('../src/core.js').catch(() => ({}));
test('all default rules are editable data, without joke exceptions', () => {
 assert.equal(typeof core.defaults, 'function');
 const s=core.defaults();assert.equal(s.model,undefined);assert.equal(s.targetLanguage,undefined);
 assert.equal(s.rules.length,4); assert.ok(s.rules.every(r=>r.enabled && r.id && r.text));
 assert.doesNotMatch(JSON.stringify(s.rules),/ジョーク|冗談/);
});
test('explicit empty rules survive normalization and arbitrary rules roundtrip',()=>{
 assert.equal(typeof core.normalizeSettings,'function');
 assert.deepEqual(core.normalizeSettings({rules:[]},'ja').rules,[]);
 const rules=[{id:'bugs',text:'虫の写真・動画を除外。文章はOK',enabled:false}];
 assert.deepEqual(core.normalizeSettings({rules},'ja').rules,rules);
});
test('Jev incomplete/malformed answers never silently allow a post',()=>{
 assert.equal(typeof core.parseDecisions,'function');
 const questions=[{key:'r0s0',ruleId:'r',text:'虫',source:'image:0'}];
 assert.throws(()=>core.parseDecisions({answers:{}},questions));
 const excluded=core.parseDecisions({answers:{r0s0:{type:'noul',noul:0.94}}},questions);
 assert.equal(excluded.matches[0].ruleId,'r');assert.equal(excluded.matches[0].source,'image:0');
 assert.equal(core.parseDecisions({answers:{r0s0:{noul:0.5}}},questions).uncertain,true);
});
test('cache depends on text, warnings, ad labels and enabled rules only',()=>{
 const p={id:'1',segments:[{text:'a'}],warnings:[],promoted:false},s=core.defaults();
 assert.equal(core.cacheKey(p,s),core.cacheKey({...p,media:[{url:'https://invalid.test'}],mediaWarnings:['obsolete']},{...s,targetLanguage:'en',model:'obsolete'}));
 assert.notEqual(core.cacheKey(p,s),core.cacheKey({...p,segments:[{text:'b'}]},s));
 assert.notEqual(core.cacheKey(p,s),core.cacheKey({...p,promoted:true},s));
 assert.notEqual(core.cacheKey(p,s),core.cacheKey({...p,warnings:['incomplete']},s));
 assert.notEqual(core.cacheKey(p,s),core.cacheKey(p,{...s,rules:[]}));
});
test('legacy model configuration is discarded while custom rules remain unchanged',()=>{
 assert.equal(core.normalizeSettings({model:'gpt-4.1-mini',targetLanguage:'ja'}).model,undefined);
 assert.equal(core.normalizeSettings({model:'gpt-4.1-mini',targetLanguage:'ja'}).targetLanguage,undefined);
 for(const name of ['sameLanguage','needsTranslation','allowedMediaUrl'])assert.equal(core[name],undefined);
 assert.ok(core.defaults().rules.filter(r=>r.id!=='ads').every(r=>/text/i.test(r.text)));
});
test('legacy default rules become English without changing custom rules or enabled flags',()=>{
 const settings=core.normalizeSettings({rules:[{id:'anger',text:'強い怒りや敵意を含む投稿。',enabled:false},{id:'mockery',text:'私が編集したルール',enabled:true},{id:'custom',text:'虫の写真',enabled:true}]});
 assert.equal(settings.rules[0].text,'Post text expressing strong anger or hostility.');
 assert.equal(settings.rules[0].enabled,false);
 assert.equal(settings.rules[1].text,'私が編集したルール');
 assert.equal(settings.rules[2].text,'虫の写真');
});
