import {chromium,expect} from '@playwright/test';
import {resolve} from 'node:path';
const paths=['nagi-feed','x-force-translator'].map(p=>resolve(`dist/${p}/chrome`));
const context=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,locale:'ja-JP',args:[`--disable-extensions-except=${paths.join(',')}`,`--load-extension=${paths.join(',')}`]});
try{
 await expect.poll(()=>context.serviceWorkers().length).toBe(2);
 const workers={};
 for(const worker of context.serviceWorkers()){
  const name=await worker.evaluate(()=>chrome.runtime.getManifest().name);workers[name]=worker;
  const page=await context.newPage();await page.goto(`chrome-extension://${new URL(worker.url()).hostname}/settings.html`);
  await expect(page.locator('h1')).toHaveText(name);
  await expect(page.locator(name==='Nagi Feed'?'#target-language':'#rules')).not.toBeVisible();
  await page.locator('#credentials summary').click();await page.locator('#jev').fill('fixture');await page.locator('#openai').fill('fixture');await page.locator('#save-keys').click();await expect(page.locator('#key-status')).toContainText('保存しました');
  await page.screenshot({path:`artifacts/${name.replaceAll(' ','-')}-settings.png`,fullPage:true});
  await worker.evaluate(()=>{
   globalThis.calls=[];
   globalThis.fetch=async(url,init)=>{
    const body=JSON.parse(init.body);calls.push(body);
    if(body.state){const answers={};for(const key of Object.keys(body.questions))answers[key]={noul:body.state.segments?0.99:body.state.sources.some(s=>s.text.includes('HATE'))?0.99:0.01};return Response.json({answers});}
    await new Promise(r=>setTimeout(r,1800));
    return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({translations:JSON.parse(body.input[0].content[0].text).map(s=>({id:s.id,text:'翻訳された投稿',changed:true}))})}]}]});
   };
  });
 }
 await context.route('https://x.com/**',r=>r.fulfill({contentType:'text/html',body:`<html><head><meta charset="utf-8"><style>body{font:16px system-ui;margin:30px}article{padding:20px;border-bottom:1px solid #ddd}</style></head><body><h1>2つの拡張の動作確認</h1><article data-testid="tweet" id="normal"><a href="/demo/status/1"><time>今</time></a><div data-testid="tweetText" lang="en">Hello world</div></article><article data-testid="tweet" id="excluded"><a href="/demo/status/2"><time>今</time></a><div data-testid="tweetText" lang="en">HATE</div></article></body></html>`}));
 const page=await context.newPage();await page.goto('https://x.com/home');
 await expect(page.locator('#normal .xft-progress')).toHaveText('翻訳中…');
 await expect(page.locator('#normal .xft-busy')).toBeVisible();
 await page.screenshot({path:'artifacts/split-translating.png'});
 await expect(page.locator('#normal .xft-translated')).toHaveText('翻訳された投稿');
 await expect(page.locator('#normal .cf-progress')).toHaveText('Nagi Feed: Checked · No matches');
 await expect(page.locator('#excluded .cf-row')).toBeVisible();
 expect(await page.locator('#excluded').evaluate(el=>el.getBoundingClientRect().height)).toBeLessThanOrEqual(26);
 await page.locator('#excluded .cf-row').click();await expect(page.locator('#excluded .xft-translated')).toBeVisible();
 await page.locator('#excluded .cf-restore button').click();
 const nagiCalls=await workers['Nagi Feed'].evaluate(()=>calls);
 expect(nagiCalls.some(b=>b.state?.segments||b.text?.format.name==='translations')).toBe(false);
 const translatorCalls=await workers['X Force Translator'].evaluate(()=>calls);
 expect(translatorCalls.some(b=>b.state?.sources||b.text?.format.name==='media_evidence')).toBe(false);
 await page.screenshot({path:'artifacts/split-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/split-mobile.png'});
 // Disabling filtering must restore the post without destroying translation.
 await workers['Nagi Feed'].evaluate(async()=>{const {settings}=await chrome.storage.local.get('settings');await chrome.storage.local.set({settings:{...settings,enabled:false}});});
 await expect(page.locator('#excluded .cf-row')).toHaveCount(0);
 await expect(page.locator('#excluded .xft-translated')).toBeVisible();
 await workers['Nagi Feed'].evaluate(async()=>{const {settings}=await chrome.storage.local.get('settings');await chrome.storage.local.set({settings:{...settings,enabled:true}});});
 await expect(page.locator('#excluded .cf-row')).toBeVisible();
 // Disabling translation must leave the collapsed row untouched.
 await workers['X Force Translator'].evaluate(async()=>{const {settings}=await chrome.storage.local.get('settings');await chrome.storage.local.set({settings:{...settings,enabled:false}});});
 await expect(page.locator('.xft-translation')).toHaveCount(0);
 await expect(page.locator('#excluded .cf-row')).toBeVisible();
 await page.locator('#excluded .cf-row').click();
 await expect(page.locator('#excluded [data-testid="tweetText"]')).toBeVisible();
 // A translator failure cannot prevent Nagi's independent exclusion decision.
 await workers['X Force Translator'].evaluate(async()=>{globalThis.fetch=async()=>{throw new Error('fixture failure');};const {settings}=await chrome.storage.local.get('settings');await chrome.storage.local.set({settings:{...settings,enabled:true}});});
 await page.evaluate(()=>{for(const el of document.querySelectorAll('article')){el.querySelector('a').href+='/';el.querySelector('[data-testid="tweetText"]').textContent+=' new';}});
 await expect(page.locator('#normal .xft-progress')).toContainText('X Force Translator：');
 await expect(page.locator('#normal')).toHaveAttribute('data-xft-state','error');
 await expect(page.locator('#excluded .cf-row')).toBeVisible();
 console.log('PASS: independent settings and API operations, simultaneous filtering/translation, progress, collapse and reveal.');
}finally{await context.close();}
