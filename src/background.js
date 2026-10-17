import {defaults,normalizeSettings,cacheKey} from './core.js';
import {analyze} from './pipeline.js';
import {readKeys,writeKeys,migrateSessionKeys} from './key-store.js';
const api=globalThis.browser||chrome;
const cache=new Map(),pending=new Map();let generation=0;
const ready=(async()=>{
 await api.storage.session?.setAccessLevel?.({accessLevel:'TRUSTED_CONTEXTS'});
 await migrateSessionKeys(api);
 const data=await api.storage.local.get(['settings','defaultRulesVersion']);
 if(!data.defaultRulesVersion){
  const settings=normalizeSettings(data.settings,api.i18n.getUILanguage());
  if(!settings.rules.some(r=>r.id==='ads')&&settings.rules.length<30)settings.rules.push(defaults().rules.find(r=>r.id==='ads'));
  await api.storage.local.set({settings,defaultRulesVersion:2});
 }
})();
const getSettings=async()=>normalizeSettings((await api.storage.local.get('settings')).settings,api.i18n.getUILanguage());
function validatePost(post){
 if(!post||typeof post.id!=='string'||!Array.isArray(post.segments)||post.segments.length>12)throw new Error('Invalid post format.');
 for(const s of post.segments)if(typeof s.text!=='string'||s.text.length>30000||typeof s.id!=='string'||typeof s.source!=='string')throw new Error('The post is too long or has an unsupported format.');
 if(JSON.stringify(post).length>9000000)throw new Error('The post is too large.');
}
const isX=sender=>{try{return ['https://x.com','https://twitter.com'].includes(new URL(sender.url).origin)&&!!sender.tab;}catch{return false;}};
const isSettings=sender=>sender.id===api.runtime.id&&sender.url?.startsWith(api.runtime.getURL('settings.html'));
let active=0;const waiters=[];let feedbackLock=Promise.resolve();
async function limited(fn){if(active>=2)await new Promise(resolve=>waiters.push(resolve));active++;try{return await fn();}finally{active--;waiters.shift()?.();}}
async function handle(message,sender){
 await ready;
 if(message.type==='feedback:claim'&&isX(sender)){
  const task=feedbackLock.then(async()=>{
   const settings=await getSettings();
   if(!settings.enabled||!settings.autoNotInterested||!/^\d+$/.test(message.postId||'')||!/^\/[A-Za-z0-9_]{1,15}$/.test(message.account||''))return {claimed:false};
   const key=`feedback:${message.account.toLowerCase()}:${message.postId}`;
   if((await api.storage.local.get(key))[key])return {claimed:false};
   await api.storage.local.set({[key]:Date.now()});return {claimed:true};
  });feedbackLock=task.catch(()=>{});return task;
 }
 if(message.type==='settings:get'&&(isX(sender)||isSettings(sender))){const settings=await getSettings();if(isX(sender))return {settings};const keys=await readKeys();return {settings,configured:{jev:!!keys.jev}};}
 if(message.type==='settings:save'&&isSettings(sender)){const settings=normalizeSettings(message.settings,api.i18n.getUILanguage());generation++;cache.clear();await api.storage.local.set({settings});return {settings};}
 if(message.type==='keys:save'&&isSettings(sender)){
  const keys=await readKeys();
  for(const k of ['jev'])if(Object.hasOwn(message.keys||{},k)){const v=message.keys[k];if(typeof v!=='string'||v.length>1024||/[\r\n]/.test(v))throw new Error('Check the API key format.');keys[k]=v.trim();}
  await writeKeys(keys);generation++;cache.clear();await api.storage.local.set({keyRevision:crypto.randomUUID()});return {configured:{jev:!!keys.jev}};
 }
 if(message.type==='settings:open'&&isX(sender)){await api.tabs.create({url:api.runtime.getURL('settings.html')});return {};}
 if(message.type==='analyze'&&isX(sender)){
  const input=message.post;
  const post=input&&{id:input.id,segments:input.segments,promoted:input.promoted===true,warnings:input.warnings};
  validatePost(post);const settings=await getSettings();if(!settings.enabled)return {status:'disabled'};
  const keys=await readKeys();const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(generation+cacheKey(post,settings)));const key=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
  if(cache.has(key))return cache.get(key);if(pending.has(key))return pending.get(key);
  const task=limited(()=>analyze(post,settings,keys,{})).then(result=>{cache.set(key,result);if(cache.size>200)cache.delete(cache.keys().next().value);return result;}).finally(()=>pending.delete(key));pending.set(key,task);return task;
 }
 throw new Error('This action is not allowed.');
}
api.runtime.onMessage.addListener((message,sender,reply)=>{handle(message||{},sender).then(reply).catch(error=>reply({code:error.code,error:error.message?.slice(0,220)||'Could not complete the request.'}));return true;});
api.runtime.onInstalled.addListener(()=>{api.storage.local.get('settings').then(data=>{if(!data.settings)return api.storage.local.set({settings:defaults(api.i18n.getUILanguage())});});});
