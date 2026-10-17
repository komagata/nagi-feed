import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';
const bundle=(await build({entryPoints:['src/background.js'],bundle:true,write:false,format:'iife'})).outputFiles[0].text;
async function harness({stored={jev:'fixture-saved',openai:'obsolete-fixture'},legacy}={}){
 let record=stored,listener;const local={},session=legacy?{keys:legacy}:{};const calls=[];
 const storage=data=>({get:async key=>typeof key==='string'?{[key]:data[key]}:{...data},set:async value=>Object.assign(data,value),remove:async key=>{delete data[key];},setAccessLevel:async()=>{}});
 const indexedDB={open(){const request={};queueMicrotask(()=>{request.result={transaction(){const tx={};tx.objectStore=()=>({get(){const req={result:record};queueMicrotask(()=>tx.oncomplete());return req;},put(value){record=value;const req={};queueMicrotask(()=>tx.oncomplete());return req;}});return tx;}};request.onsuccess();});return request;}};
 const api={runtime:{id:'fictional-extension',getURL:p=>`chrome-extension://fictional-extension/${p}`,onMessage:{addListener:fn=>{listener=fn;}},onInstalled:{addListener(){}}},storage:{local:storage(local),session:storage(session)},i18n:{getUILanguage:()=> 'en'},tabs:{sendMessage:async()=>{},create:async()=>{}}};
 runInNewContext(bundle,{chrome:api,indexedDB,URL,TextEncoder,crypto:webcrypto,AbortSignal,fetch:async(url,init)=>{calls.push({url,body:JSON.parse(init.body)});return {ok:true,json:async()=>({answers:Object.fromEntries(Object.keys(JSON.parse(init.body).questions).map(k=>[k,{noul:0.01}]))})};},queueMicrotask});
 const settingsSender={id:api.runtime.id,url:api.runtime.getURL('settings.html')},xSender={url:'https://x.com/home',tab:{id:1}};
 const send=(message,sender=settingsSender)=>new Promise(resolve=>listener(message,sender,resolve));
 await send({type:'settings:get'});
 return {send,xSender,calls,local,session,record:()=>record};
}
test('key responses and persistence whitelist only Jev, preserving existing Jev',async()=>{
 const h=await harness();let response=await h.send({type:'settings:get'});
 assert.deepEqual(JSON.parse(JSON.stringify(response.configured)),{jev:true});assert.ok(!JSON.stringify(response).includes('fixture'));
 response=await h.send({type:'keys:save',keys:{openai:'ignored-fixture'}});
 assert.deepEqual(JSON.parse(JSON.stringify(h.record())),{jev:'fixture-saved'});
 assert.deepEqual(JSON.parse(JSON.stringify(response.configured)),{jev:true});
 await h.send({type:'keys:save',keys:{jev:'  new-fixture  ',openai:'ignored'}});assert.deepEqual(JSON.parse(JSON.stringify(h.record())),{jev:'new-fixture'});
 await h.send({type:'keys:save',keys:{jev:''}});assert.equal((await h.send({type:'settings:get'})).configured.jev,false);
 assert.equal(h.local.keys,undefined);
 assert.equal((await h.send({type:'settings:get'},h.xSender)).configured,undefined);
 assert.match((await h.send({type:'keys:save',keys:{jev:'forbidden'}},h.xSender)).error,/not allowed/);
});
test('legacy session migration preserves Jev alone and prioritizes persisted Jev',async()=>{
 for(const stored of [{}, {jev:'fixture-saved',openai:'obsolete'}]){
  const h=await harness({stored,legacy:{jev:'fixture-session',openai:'obsolete-session'}});
  assert.deepEqual(JSON.parse(JSON.stringify(h.record())),{jev:stored.jev||'fixture-session'});assert.equal(h.session.keys,undefined);
 }
});
test('legacy media is ignored before validation, caching and API requests',async()=>{
 const h=await harness();const post={id:'1',segments:[{id:'0',source:'body',text:'Hello'}],media:[{kind:'unknown',frames:['invalid']}],mediaWarnings:['old warning']};
 let r=await h.send({type:'analyze',post},h.xSender);assert.equal(r.status,'allowed');assert.deepEqual(r.mediaWarnings||[],[]);
 r=await h.send({type:'analyze',post:{...post,media:'obsolete format'}},h.xSender);assert.equal(r.status,'allowed');assert.equal(h.calls.length,1);
 assert.equal(h.calls[0].url,'https://api.typesafe.ai/v1/systemone');assert.equal(h.calls[0].body.state.sources.length,1);assert.doesNotMatch(JSON.stringify(h.calls),/frames|invalid|old warning/);
});
