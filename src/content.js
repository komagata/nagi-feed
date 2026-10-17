import {nagiStatus} from './nagi-status.js';
import {filters,productName} from './product.js';
import {extractPost,expandLongPosts} from './dom.js';
import {sourceLabel,advertisementDecision} from './core.js';
import {feedbackEligible,sendNotInterested} from './feedback.js';
const api=globalThis.browser||chrome;
const entries=new WeakMap();let settings,revision=0;const queue=[];let running=0;
let feedbackQueue=Promise.resolve();
function scheduleFeedback(article,entry,snapshot,result){
 if(!filters||!feedbackEligible(snapshot,result,settings))return;
 const epoch=revision,account=document.querySelector('[data-testid="AppTabBar_Profile_Link"]')?.getAttribute('href');
 if(!account||location.pathname!=='/home')return;
 feedbackQueue=feedbackQueue.then(async()=>{
  const valid=()=>revision===epoch&&entries.get(article)===entry&&article.isConnected&&!document.hidden&&settings.enabled&&settings.autoNotInterested&&extractPost(article).id===snapshot.id&&!extractPost(article).promoted&&document.querySelector('[data-testid="AppTabBar_Profile_Link"]')?.getAttribute('href')===account;
  if(!valid()||document.activeElement?.matches('input,textarea,[contenteditable="true"]'))return;
  const sent=await sendNotInterested(article,{document,valid,claim:async()=>(await send({type:'feedback:claim',account,postId:snapshot.id})).claimed});
  if(sent&&article.isConnected){const row=article.querySelector('.cf-row');if(row)row.title+=' / Selected “Not interested” on X';}
  await new Promise(resolve=>setTimeout(resolve,3000));
 }).catch(()=>{});
}
async function send(message){const result=await api.runtime.sendMessage(message);if(result?.error)throw Object.assign(new Error(result.error),{code:result.code});return result;}
function element(tag,text,className){const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;}
function button(text,fn){const b=element('button',text);b.type='button';b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();fn();});return b;}
function uncover(article){article.classList.remove('cf-covered');article.querySelectorAll('[data-cf-inert]').forEach(n=>{n.inert=false;n.removeAttribute('data-cf-inert');});}
function clearUI(article){article.querySelectorAll('.cf-ui').forEach(n=>n.remove());article.querySelectorAll('[data-cf-original]').forEach(n=>{n.hidden=false;n.removeAttribute('data-cf-original');});uncover(article);}
function reveal(article){uncover(article);if(filters)showNagiStatus(article,entries.get(article).result);article.querySelector('.cf-row')?.remove();const restore=element('div',null,'cf-ui cf-restore');restore.append(button('Collapse again',()=>{restore.remove();const e=entries.get(article);if(e)collapse(article,e.result,e);}));article.append(restore);restore.querySelector('button').focus();}
function collapse(article,result,entry){
 article.querySelectorAll('.cf-row,.cf-restore').forEach(n=>n.remove());entry.result=result;
 if(result.status!=='excluded'||!result.matches?.length){uncover(article);return;}
 article.classList.add('cf-covered');
 const reasons=[...new Set(result.matches.map(x=>x.text))].join('・');
 const sources=[...new Set(result.matches.map(m=>sourceLabel(m.source)))].join('・');
 const row=button('',()=>reveal(article));row.className='cf-ui cf-row';row.setAttribute('aria-label','Show post');row.setAttribute('aria-expanded','false');
 row.title=`Filtered: ${reasons} (${sources}) — Click to show post`;
 row.append(element('span',(filters?'Checked · Hidden: ':'Hidden: ')+reasons,'cf-reason'),element('span','Show ▾','cf-row-action'));
 article.append(row);entry.result=result;
 for(const child of article.children)if(!child.classList.contains('cf-ui')&&!child.inert){child.inert=true;child.setAttribute('data-cf-inert','');}
 article.querySelectorAll('video').forEach(v=>v.pause());
}
async function process(article,entry){
 const epoch=revision;try{
  if(filters){article.dataset.cfState='processing';showNagiStatus(article,{status:'processing'});}
  entry.expanding=true;
  await expandLongPosts(article);
  entry.expanding=false;
  if(entries.get(article)!==entry||epoch!==revision||!article.isConnected)return;
  let snapshot=extractPost(article);const identity=JSON.stringify(snapshot);entry.fingerprint=identity;
  const result=await send({type:'analyze',post:snapshot,requestId:entry.requestId});
  if(entries.get(article)!==entry||epoch!==revision||!article.isConnected)return;
  const current=extractPost(article);if(JSON.stringify(current)!==identity){entries.delete(article);scan();return;}
  article.querySelectorAll('.cf-progress,.cf-mark-slot,.cf-mark').forEach(n=>n.remove());
  article.dataset.cfState=result.status;
  if(result.status==='allowed'||result.status==='disabled'){uncover(article);article.querySelector('.cf-row')?.remove();entry.result=result;}else collapse(article,result,entry);
  if(filters&&['allowed','incomplete'].includes(result.status))showNagiStatus(article,result);

  scheduleFeedback(article,entry,snapshot,result);
 }catch(error){if(entries.get(article)!==entry||epoch!==revision)return;article.dataset.cfState='error';collapse(article,{status:'error',error:error.message,code:error.code},entry);if(filters)showNagiStatus(article,{status:'error',error:error.message,code:error.code});}
}
function pump(){
 const distance=article=>{const r=article.getBoundingClientRect();return Math.max(0,r.top-innerHeight,-r.bottom);};
 queue.sort((a,b)=>distance(a[0])-distance(b[0]));
 while(running<2&&queue.length){const [article,entry]=queue.shift();if(entries.get(article)!==entry||!article.isConnected)continue;running++;process(article,entry).finally(()=>{running--;pump();});}
}
const visible=new IntersectionObserver(list=>{for(const item of list)if(item.isIntersecting){visible.unobserve(item.target);const entry=entries.get(item.target);if(entry)queue.push([item.target,entry]);}pump();},{rootMargin:'600px 0px 1600px 0px'});
function scan(){if(!settings)return;for(const article of document.querySelectorAll('article[data-testid="tweet"]')){
 if(!settings.enabled){clearUI(article);article.dataset.cfState='disabled';continue;}
 const old=entries.get(article);if(old?.expanding)continue;
 const snapshot=extractPost(article),fingerprint=JSON.stringify(snapshot);if(old?.fingerprint===fingerprint)continue;
 clearUI(article);const entry={fingerprint,requestId:crypto.randomUUID(),result:{status:'pending'}};entries.set(article,entry);
 const advertisement=advertisementDecision(snapshot,settings);
 if(filters&&advertisement){article.dataset.cfState='excluded';collapse(article,advertisement,entry);continue;}
 article.dataset.cfState='pending';collapse(article,entry.result,entry);showNagiStatus(article,{status:'pending'});visible.observe(article);
}}
let scheduled;
const observer=new MutationObserver(changes=>{if(changes.every(c=>c.target.nodeType===1&&c.target.closest?.('.cf-ui')))return;clearTimeout(scheduled);scheduled=setTimeout(scan,180);});
async function initialize(){
 try{settings=(await send({type:'settings:get'})).settings;document.documentElement.classList.toggle('cf-disabled',!settings.enabled);scan();}catch{document.documentElement.classList.add('cf-disabled');}
}
function watch(){observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['src','lang']});initialize();}
if(document.documentElement)watch();else document.addEventListener('DOMContentLoaded',watch,{once:true});
api.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&(changes.settings||changes.keyRevision)){revision++;for(const a of document.querySelectorAll('article[data-testid="tweet"]')){entries.delete(a);clearUI(a);}initialize();}});
document.addEventListener('play',e=>{if(e.target instanceof HTMLVideoElement&&e.target.closest('article')?.classList.contains('cf-covered'))e.target.pause();},true);

function showNagiStatus(article,result){
 const status=nagiStatus(result);
 article.querySelectorAll('.cf-progress,.cf-mark-slot,.cf-mark').forEach(n=>n.remove());
 const mark=button('',()=>{send({type:'settings:open'}).catch(()=>{mark.title='Open Nagi Feed settings from the Chrome extensions menu.';mark.setAttribute('aria-label',mark.title);});});
 const attention=!status.complete&&!status.busy&&result.status!=='pending';
 mark.className='cf-ui cf-mark '+(status.complete?'cf-complete':status.busy?'cf-checking':attention?'cf-attention':'cf-queued');
 mark.title=[status.text,status.detail,'Open settings'].filter(Boolean).join('. ');mark.setAttribute('aria-label',mark.title);
 const glyph=element('span','凪','cf-glyph');glyph.setAttribute('aria-hidden','true');mark.append(glyph);
 if(status.complete||attention){const badge=element('span',status.complete?'✓':'!','cf-mark-check');badge.setAttribute('aria-hidden','true');mark.append(badge);}
 const grok=[...article.querySelectorAll('button[aria-label]')].find(b=>/Grok|Explain this post|このポストを説明/i.test(b.getAttribute('aria-label'))&&!b.closest('[data-testid="quoteTweet"],div[role="link"]'));
 const anchor=grok||article.querySelector('[data-testid="caret"]');
 if(anchor){let host=anchor;while(host.parentElement!==article&&host.parentElement&&!host.parentElement.querySelector('[data-testid="caret"]'))host=host.parentElement;
  // Insert beside the Grok wrapper in the header actions row.
  if(host.parentElement===article)host=anchor;
  host.before(mark);
 }

}
