import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../src/core.js';
const pipeline=await import('../src/pipeline.js').catch(()=>({}));
test('text and quotes alone are classified, with media never loaded or described',async()=>{
 const segments=[{id:'0',source:'body',text:'こんにちは',lang:'ja'},{id:'1',source:'quote:1',text:'Una mañana tranquila.',lang:'es'}];
 const fail=async()=>{assert.fail('media processing must never run');};let calls=0;
 const result=await pipeline.analyze({segments,media:[{kind:'image',url:'https://invalid.test/image'},{kind:'video',frames:['legacy']}],mediaWarnings:['legacy unchecked media']},defaults(),{jev:'fixture'},{loadMedia:fail,describe:fail,classify:async(sources,rules,key)=>{calls++;assert.deepEqual(sources,segments.map(({source,text})=>({source,text})));assert.equal(key,'fixture');assert.ok(rules.every(r=>r.id!=='ads'));return {matches:[],uncertain:false};}});
 assert.equal(calls,1);assert.equal(result.status,'allowed');assert.equal(result.requiredKey,undefined);assert.deepEqual(result.mediaWarnings||[],[]);
});
test('media-only and blank text posts are allowed without any API key or calls',async()=>{
 for(const segments of [[],[{source:'body',text:'  '}]] ){
  const result=await pipeline.analyze({segments,media:[{kind:'video'}]},defaults(),{},{classify:async()=>assert.fail('no text to classify'),loadMedia:async()=>assert.fail('no media loading')});
  assert.equal(result.status,'allowed');
 }
});
test('missing Jev key for actual text fails before any API call',async()=>{
 await assert.rejects(()=>pipeline.analyze({segments:[{source:'body',text:'hello'}],media:[]},defaults(),{},{}),e=>e.code==='missing_jev_key'&&/Jev/.test(e.message));
});
test('a text match excludes the whole media-bearing post',async()=>{
 const result=await pipeline.analyze({segments:[{source:'body',text:'hostile'}],media:[{kind:'video'}]},defaults(),{jev:'fixture'},{classify:async()=>({matches:[{ruleId:'anger',source:'body',text:'hostility'}],uncertain:false}),loadMedia:async()=>assert.fail('no media loading')});
 assert.equal(result.status,'excluded');assert.equal(result.matches[0].source,'body');
});
test('Nagi never performs language detection or translation, including with no rules',async()=>{
 const fail=async()=>{throw new Error('translation must not run');};
 const result=await pipeline.analyze({segments:[{id:'0',text:'Hello',source:'body'}],media:[]},{...defaults('ja'),rules:[]},{},{translationCandidates:fail,translate:fail});
 assert.equal(result.status,'allowed');assert.deepEqual(result.translations,[]);
});
test('uncertain exclusion decision still displays the post without translation',async()=>{
 let translated=false;
 const result=await pipeline.analyze({segments:[{id:'0',text:'hello',source:'body'}],media:[]},defaults('ja'),{jev:'fixture'},{
  classify:async()=>({matches:[],uncertain:true}),loadMedia:async()=>({images:[],warnings:[]}),translationCandidates:async s=>s,translate:async()=>{translated=true;return [];}
 });assert.equal(result.status,'allowed');assert.equal(translated,false);
});
test('official advertisements are excluded without any API or keys',async()=>{
 const result=await pipeline.analyze({promoted:true,segments:[],media:[]},defaults('ja'),{},{});
 assert.equal(result.status,'excluded');assert.equal(result.matches[0].ruleId,'ads');
});
test('legacy advertising rule never classifies promotional quote text as an X ad',async()=>{
 const rule={id:'ads',text:'Xが広告・プロモーションとして表示している投稿。',enabled:true};
 let classified=false;
 const deps={classify:async()=>{classified=true;return {matches:[{ruleId:'ads',source:'quote:1',text:rule.text}],uncertain:false};},translationCandidates:async()=>[]};
 const result=await pipeline.analyze({id:'123',promoted:false,segments:[{source:'quote:1',text:'Evo Franceの私のブースで入手可能〜〜'}],media:[]},{...defaults('ja'),rules:[rule]},{jev:'fixture'},deps);
 assert.equal(result.status,'allowed');assert.equal(classified,false);
 const ad=await pipeline.analyze({id:'124',promoted:true,segments:[],media:[]},{...defaults('ja'),rules:[rule]}, {},{});
 assert.equal(ad.status,'excluded');assert.equal(ad.matches[0].source,'advertisement');
});
