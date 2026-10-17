import {chromium,expect} from '@playwright/test';
import {resolve,join} from 'node:path';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const paths=[resolve('dist/chrome')];
const profile=await mkdtemp(join(tmpdir(),'nagi-text-only-'));
const launch=()=>chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,locale:'ja-JP',args:[`--disable-extensions-except=${paths.join(',')}`,`--load-extension=${paths.join(',')}`]});
let context=await launch();
try{
 await expect.poll(()=>context.serviceWorkers().length).toBe(1);
 const workers={};
 for(const worker of context.serviceWorkers()){
  const name=await worker.evaluate(()=>chrome.runtime.getManifest().name);workers[name]=worker;
  const page=await context.newPage();await page.goto(`chrome-extension://${new URL(worker.url()).hostname}/settings.html`);
  await expect(page.locator('h1')).toHaveText(name);
  await expect(page.locator(name==='Nagi Feed'?'#target-language':'#rules')).not.toBeVisible();
  await page.locator('#credentials summary').click();await expect(page.locator('#openai')).toHaveCount(0);await expect(page.locator('input[type=password]')).toHaveCount(1);await page.locator('#jev').fill('fixture');
  await page.locator('[data-reveal=jev]').click();await expect(page.locator('#jev')).toHaveAttribute('type','text');await page.locator('[data-reveal=jev]').click();await expect(page.locator('#jev')).toHaveAttribute('type','password');await page.locator('#save-keys').click();await expect(page.locator('#key-status')).toContainText('API key saved');
  await page.screenshot({path:`artifacts/${name.replaceAll(' ','-')}-settings.png`,fullPage:true});
  await worker.evaluate(()=>{
   globalThis.calls=[];globalThis.hold=true;
   globalThis.fetch=async(url,init)=>{
    while(globalThis.hold)await new Promise(r=>setTimeout(r,25));
    if(url!=='https://api.typesafe.ai/v1/systemone')throw new Error('Unexpected API URL');
    const body=JSON.parse(init.body);calls.push({url,...body});
    const answers={};for(const key of Object.keys(body.questions))answers[key]={noul:body.state.sources.some(s=>s.text.includes('HATE'))?0.99:0.01};return Response.json({answers});
   };
  });
 }
 await context.route('https://x.com/**',r=>r.fulfill({contentType:'text/html',body:`<html><head><meta charset="utf-8"><style>body{font:16px system-ui;margin:30px}article{padding:20px;border-bottom:1px solid #ddd}</style></head><body><h1>Nagi Feed 動作確認</h1><article data-testid="tweet" id="normal"><div class="header-actions" style="display:flex;justify-content:flex-end"><div><button aria-label="Grok actions">Grok</button></div><button data-testid="caret">More</button></div><a href="/demo/status/1"><time>今</time></a><div data-testid="tweetText" lang="ja">こんにちは</div><div data-testid="quoteTweet"><div data-testid="tweetText" lang="es">Una mañana tranquila.</div></div><video id="allowed-video"></video><div data-testid="tweetPhoto"><img></div></article><article data-testid="tweet" id="excluded"><div class="header-actions" style="display:flex;justify-content:flex-end"><div><button aria-label="Grok actions">Grok</button></div><button data-testid="caret">More</button></div><a href="/demo/status/2"><time>今</time></a><div data-testid="tweetText" lang="en">HATE</div><video id="excluded-video"></video></article><article data-testid="tweet" id="media-only"><div class="header-actions"><button aria-label="Grok actions">Grok</button><button data-testid="caret">More</button></div><a href="/demo/status/3"><time>now</time></a><div data-testid="videoPlayer"><video id="only-video"></video></div></article><article data-testid="tweet" id="official-ad"><div><div><span>Ad</span></div><button data-testid="caret">More</button></div><a href="/demo/status/4"><time>now</time></a><div data-testid="tweetPhoto"><img></div></article></body></html>`}));
 await context.addInitScript(()=>{
  globalThis.mediaOperations=[];
  for(const method of ['pause','play'])HTMLMediaElement.prototype[method]=function(){mediaOperations.push({id:this.id,method});return method==='play'?Promise.resolve():undefined;};
  Object.defineProperty(HTMLMediaElement.prototype,'currentTime',{get(){return 7;},set(){mediaOperations.push({id:this.id,method:'seek'});}});
  HTMLCanvasElement.prototype.getContext=function(){mediaOperations.push({method:'canvas'});throw new Error('No canvas sampling allowed');};
 });
 const page=await context.newPage();await page.goto('https://x.com/home');
 await expect(page.locator('#normal .cf-checking .cf-glyph')).toHaveText('凪');
 expect(await page.locator('#normal .cf-checking .cf-glyph').evaluate(el=>getComputedStyle(el).animationName)).toBe('cf-spin');
 await workers['Nagi Feed'].evaluate(()=>{globalThis.hold=false;});
 await expect(page.locator('#normal')).toHaveAttribute('data-cf-state','allowed');
 await expect(page.locator('#normal .cf-complete')).toHaveText('凪✓');
 await expect(page.locator('#normal .cf-complete')).toHaveAttribute('aria-label','Nagi Feed: Checked · No matches. Open settings');
 await expect(page.locator('#normal .cf-progress')).toHaveCount(0);
 expect(await page.locator('#normal .cf-complete .cf-glyph').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
 const opened=context.waitForEvent('page');await page.locator('#normal .cf-complete').click();const options=await opened;await options.waitForURL('**/settings.html');await options.close();
 const placement=await page.locator('#normal').evaluate(el=>({mark:el.querySelector('.cf-mark').getBoundingClientRect().toJSON(),grok:el.querySelector('[aria-label="Grok actions"]').getBoundingClientRect().toJSON()}));
 expect(placement.mark.right).toBeLessThanOrEqual(placement.grok.x);
 expect(Math.abs((placement.mark.y+placement.mark.height/2)-(placement.grok.y+placement.grok.height/2))).toBeLessThan(3);
 await expect(page.locator('.cf-mark-slot')).toHaveCount(0);
 await expect(page.locator('#excluded .cf-row')).toBeVisible();
 expect(await page.locator('#excluded').evaluate(el=>el.getBoundingClientRect().height)).toBeLessThanOrEqual(26);
 await page.locator('#excluded .cf-row').click();await expect(page.locator('#excluded [data-testid="tweetText"]')).toBeVisible();
 await page.locator('#excluded .cf-restore button').click();
 await expect(page.locator('#media-only .cf-complete')).toHaveText('凪✓');
 await expect(page.locator('#official-ad .cf-row')).toBeVisible();
 const operations=await page.evaluate(()=>mediaOperations);
 expect(operations.filter(x=>x.id!=='excluded-video'||x.method!=='pause')).toEqual([]);
 expect(await page.locator('#allowed-video').evaluate(v=>v.currentTime)).toBe(7);
 const nagiCalls=await workers['Nagi Feed'].evaluate(()=>calls);
 expect(nagiCalls).toHaveLength(2);
 expect(nagiCalls.every(b=>b.url==='https://api.typesafe.ai/v1/systemone')).toBe(true);
 expect(nagiCalls.some(b=>b.state.sources.some(s=>s.text==='こんにちは'))).toBe(true);
 expect(nagiCalls.some(b=>b.state.sources.some(s=>s.text==='Una mañana tranquila.'&&s.source==='quote:1'))).toBe(true);
 expect(JSON.stringify(nagiCalls)).not.toMatch(/input_image|frames|image_url|video:/);

 expect(nagiCalls.some(b=>b.state?.segments||b.text?.format.name==='translations')).toBe(false);
 await page.screenshot({path:'artifacts/split-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/split-mobile.png'});
 // Disabling filtering must restore the post without destroying translation.
 await workers['Nagi Feed'].evaluate(async()=>{const {settings}=await chrome.storage.local.get('settings');await chrome.storage.local.set({settings:{...settings,enabled:false}});});
 await expect(page.locator('#excluded .cf-row')).toHaveCount(0);
 await expect(page.locator('#excluded [data-testid="tweetText"]')).toBeVisible();
 await workers['Nagi Feed'].evaluate(async()=>{const {settings}=await chrome.storage.local.get('settings');await chrome.storage.local.set({settings:{...settings,enabled:true}});});
 await expect(page.locator('#excluded .cf-row')).toBeVisible();
 // Incomplete posts must also remain compact, with details only on the mark.
 await page.evaluate(()=>{const note=document.createElement('div');note.dataset.testid='tweetUnavailable';document.querySelector('#normal').append(note);});
 await expect(page.locator('#normal .cf-attention')).toHaveText('凪!');
 await expect(page.locator('#normal .cf-attention')).toHaveAttribute('title',/Partially checked/);
 await expect(page.locator('.cf-progress')).toHaveCount(0);
 // Reproduce X's horizontal flex layout and first-run missing credentials.
 await page.evaluate(()=>{for(const article of document.querySelectorAll('article')){const body=document.createElement('div');body.className='post-body';body.style.cssText='flex:1;min-width:0';for(const child of [...article.children])if(!child.classList.contains('cf-ui'))body.append(child);article.prepend(body);article.style.display='flex';article.style.flexDirection='row';}});
 const settingsPage=await context.newPage();await settingsPage.goto(`chrome-extension://${new URL(workers['Nagi Feed'].url()).hostname}/settings.html`);
 await settingsPage.locator('#credentials summary').click();await settingsPage.locator('[data-delete="jev"]').click();
 await expect(page.locator('#normal .cf-attention')).toHaveText('凪!');
 await expect(page.locator('#normal .cf-attention')).toHaveAttribute('title',/API key not configured/);
 await expect(page.locator('#media-only .cf-complete')).toHaveText('凪✓');await expect(page.locator('#official-ad .cf-row')).toBeVisible();
 await expect(page.locator('.cf-progress')).toHaveCount(0);
 await page.screenshot({path:'artifacts/setup-needed-mobile.png'});
 await page.setViewportSize({width:1024,height:900});await page.screenshot({path:'artifacts/setup-needed-desktop.png'});
 await page.bringToFront();
 await page.locator('#normal .cf-attention').click();
 await expect.poll(()=>context.pages().filter(p=>p.url().includes('settings.html')).length).toBeGreaterThanOrEqual(3);
 await settingsPage.reload();await expect(settingsPage.locator('#setup-guide')).toBeVisible();
 await expect(settingsPage.locator('#credentials')).not.toHaveAttribute('open','');
 await settingsPage.locator('#setup-keys').click();await expect(settingsPage.locator('#jev')).toBeVisible();await expect(settingsPage.locator('#jev')).toHaveAttribute('type','password');
 // Rule edits remain dirty until saved, including non-English custom rules.
 await settingsPage.locator('#new-rule').fill('引用の嫌味を除外');await settingsPage.locator('#add-rule button').click();
 await expect(settingsPage.locator('#status')).toContainText('Save to apply');
 await settingsPage.locator('#save').click();await expect(settingsPage.locator('#status')).toContainText('Settings saved');
 await settingsPage.reload();await expect(settingsPage.locator('#rules textarea').last()).toHaveValue('引用の嫌味を除外');
 await settingsPage.locator('#rules .rule').last().locator('button').click();await settingsPage.locator('#save').click();
 await expect(settingsPage.locator('#status')).toContainText('Settings saved');await expect(settingsPage.locator('#rules .rule')).toHaveCount(4);
 await settingsPage.locator('#credentials summary').click();await settingsPage.locator('#jev').fill('persistent-fixture');await settingsPage.locator('#save-keys').click();
 await expect(settingsPage.locator('#key-status')).toContainText('API key saved');await expect(settingsPage.locator('#setup-guide')).toBeHidden();await expect(settingsPage.locator('#jev')).toHaveValue('');
 const response=await settingsPage.evaluate(()=>chrome.runtime.sendMessage({type:'settings:get'}));expect(response.configured).toEqual({jev:true});expect(JSON.stringify(response)).not.toContain('persistent-fixture');
 const storage=await settingsPage.evaluate(async()=>({local:await chrome.storage.local.get(null),session:await chrome.storage.session.get(null)}));expect(storage.local.keys).toBeUndefined();expect(storage.session.keys).toBeUndefined();
 const manifest=await workers['Nagi Feed'].evaluate(()=>chrome.runtime.getManifest());expect(manifest.version).toBe('0.2.8');expect(manifest.host_permissions).toEqual(['https://x.com/*','https://twitter.com/*','https://api.typesafe.ai/*']);
 await context.close();context=await launch();
 const restarted=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
 const persisted=await context.newPage();await persisted.goto(`chrome-extension://${new URL(restarted.url()).hostname}/settings.html`);
 await expect(persisted.locator('#jev-status')).toHaveText('Configured');await expect(persisted.locator('#credentials')).not.toHaveAttribute('open','');await expect(persisted.locator('#jev')).toHaveValue('');await expect(persisted.locator('#jev')).toHaveAttribute('type','password');
 await persisted.locator('#credentials summary').click();await persisted.locator('[data-delete=jev]').click();await expect(persisted.locator('#jev-status')).toHaveText('Not configured');
 await context.close();context=await launch();
 const deletedWorker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');const deleted=await context.newPage();await deleted.goto(`chrome-extension://${new URL(deletedWorker.url()).hostname}/settings.html`);await expect(deleted.locator('#jev-status')).toHaveText('Not configured');
 console.log('PASS: Jev-only masked settings and persistence, text/quote decisions, no media operations, keyless media and ads, compact Grok marks, rules and setup.');
}finally{await context.close();await rm(profile,{recursive:true,force:true});}
