import test from 'node:test';import assert from 'node:assert/strict';import {parseHTML} from 'linkedom';
import {feedbackEligible,sendNotInterested} from '../src/feedback.js';
test('only excluded non-ad posts with opted-in settings can send feedback',()=>{
 const p={id:'123'},r={status:'excluded',matches:[{ruleId:'anger',source:'body'}]},s={enabled:true,autoNotInterested:true};
 assert.equal(feedbackEligible(p,r,s),true);
 for(const [post,result,settings] of [[{...p,promoted:true},r,s],[p,{...r,status:'incomplete'},s],[p,r,{...s,autoNotInterested:false}],[p,{...r,matches:[{ruleId:'ads',source:'advertisement'}]},s]])assert.equal(!!feedbackEligible(post,result,settings),false);
});
function fixture(label){
 const {document}=parseHTML('<article><div data-cf-inert inert><button data-testid="caret" aria-expanded="false"></button></div></article>');
 const article=document.querySelector('article'),caret=article.querySelector('button');let clicks=0;
 caret.click=()=>{const existing=document.querySelector('[role="menu"]');if(existing){existing.remove();caret.setAttribute('aria-expanded','false');return;}const menu=document.createElement('div');menu.setAttribute('role','menu');const item=document.createElement('div');item.setAttribute('role','menuitem');item.textContent=label;item.click=()=>{clicks++;menu.remove();caret.setAttribute('aria-expanded','false');};menu.append(item);document.append(menu);caret.setAttribute('aria-expanded','true');};
 return {document,article,clicks:()=>clicks};
}
test('sends only the exact not-interested item and suppresses duplicate claims',async()=>{
 const f=fixture('このポストに興味がない');let claimed=false;
 const deps={document:f.document,valid:()=>true,claim:async()=>{if(claimed)return false;claimed=true;return true;},wait:async()=>{}};
 assert.equal(await sendNotInterested(f.article,deps),true);assert.equal(await sendNotInterested(f.article,deps),false);assert.equal(f.clicks(),1);
});
test('does not click report, mute, block or another open menu',async()=>{
 for(const label of ['ポストを報告','ミュート','ブロック']){const f=fixture(label);assert.equal(await sendNotInterested(f.article,{document:f.document,valid:()=>true,claim:async()=>true,wait:async()=>{}}),false);assert.equal(f.clicks(),0);}
 const f=fixture('このポストに興味がない');const menu=f.document.createElement('div');menu.setAttribute('role','menu');f.document.append(menu);assert.equal(await sendNotInterested(f.article,{document:f.document,valid:()=>true,claim:async()=>true}),false);
});
