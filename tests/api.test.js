import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../src/core.js';
const api=await import('../src/api.js').catch(()=>({}));
test('Jev evaluates every enabled free-text rule against each source in one request',async()=>{
 assert.equal(typeof api.classify,'function');let body;
 const fetcher=async(url,init)=>{body=JSON.parse(init.body);return {ok:true,json:async()=>({answers:Object.fromEntries(Object.keys(body.questions).map(k=>[k,{noul:k==='r0s1'?0.99:0.01}]))})};};
 const r=await api.classify([{source:'body',text:'hello'},{source:'quote:1',text:'虫の話'}],[{id:'a',text:'虫の写真',enabled:true},{id:'b',text:'none',enabled:false}], 'secret',fetcher);
 assert.equal(body.model,'jev-latest');assert.equal(Object.keys(body.questions).length,2);assert.equal(r.matches[0].source,'quote:1');
});
test('API errors never echo remote content or credentials',async()=>{
 assert.equal(typeof api.requestJSON,'function');
 await assert.rejects(()=>api.requestJSON('https://api.typesafe.ai/v1/systemone','secret',{},async()=>({ok:false,status:401,text:async()=>'secret'})),e=>!e.message.includes('secret')&&e.message.includes('401'));
});
test('legacy translation and media APIs are absent',()=>{for(const name of ['translate','translationCandidates','describeMedia'])assert.equal(api[name],undefined);});
