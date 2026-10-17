import {chromium,expect} from '@playwright/test';
import {resolve} from 'node:path';import {mkdir,readFile} from 'node:fs/promises';import {execFileSync} from 'node:child_process';
await mkdir('artifacts',{recursive:true});
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=green:s=160x90:r=4','-t','2','-an','-c:v','libvpx','artifacts/video.webm']);
const video=await readFile('artifacts/video.webm');
const extension=resolve('dist/chrome');
const context=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,viewport:{width:1024,height:900},locale:'ja-JP',args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
try{
 let worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');const id=new URL(worker.url()).hostname;
 const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 const settings=await context.newPage();await settings.goto(`chrome-extension://${id}/settings.html`);
 await expect(settings.locator('#rules .rule')).toHaveCount(4);
 await expect(settings.locator('#credentials')).not.toHaveAttribute('open','');
 await settings.locator('#new-rule').fill('虫の写真・動画を含む投稿。文章はOK');await settings.getByRole('button',{name:'+ Add rule',exact:true}).click();await expect(settings.locator('#rules .rule')).toHaveCount(5);
 await settings.locator('#save').click();await expect(settings.locator('#status')).toContainText('保存しました');
 await settings.locator('#credentials summary').click();await settings.locator('#jev').fill('fixture-jev-key');await settings.locator('#openai').fill('fixture-openai-key');await settings.locator('#save-keys').click();await expect(settings.locator('#key-status')).toContainText('保存しました');await expect(settings.locator('#jev')).toHaveValue('');
 await settings.locator('#jev').fill('not-a-real-secret');await settings.locator('[data-reveal="jev"]').click();await expect(settings.locator('#jev')).toHaveAttribute('type','text');await settings.locator('#credentials summary').click();await expect(settings.locator('#jev')).toHaveAttribute('type','password');await settings.reload();await expect(settings.locator('#jev')).toHaveValue('');await expect(settings.locator('#credentials')).not.toHaveAttribute('open','');
 await settings.screenshot({path:'artifacts/settings-desktop.png',fullPage:true});await settings.setViewportSize({width:360,height:800});await settings.screenshot({path:'artifacts/settings-mobile.png',fullPage:true});
 await worker.evaluate(()=>{
  globalThis.testRequests=[];globalThis.testHold=true;globalThis.testReleases=[];
  globalThis.fetch=async(url,init)=>{
   if(globalThis.testHold)await new Promise(resolve=>globalThis.testReleases.push(resolve));
   if(url.includes('pbs.twimg.com'))return new Response(new Uint8Array([1,2,3]),{headers:{'content-type':'image/png'}});
   const body=JSON.parse(init.body);globalThis.testRequests.push({url,body});
   if(url.includes('typesafe')){const answers={};if(body.state.segments){for(const [i,s]of body.state.segments.entries())answers['language'+i]={noul:/Una|Bonjour/.test(s.text)?0.99:0.01};return Response.json({answers});}for(const [key,q]of Object.entries(body.questions)){const source=body.state.sources[Number(key.split('s')[1])];answers[key]={noul:(q.instructions.rule.includes('虫')&&source.text.includes('insect'))||(q.instructions.rule.includes('プロモーション')&&source.text.includes('paid advertisement'))?0.99:0.01};}return Response.json({answers});}
   const name=body.text.format.name;let result;
   if(name==='media_evidence')result={images:JSON.parse(body.input[0].content[0].text).images.map(x=>({index:x.index,description:x.source.startsWith('video')?'A green video frame.':'A clear photo of an insect.',readable:true}))};
   else result={translations:JSON.parse(body.input[0].content[0].text).map(s=>({id:s.id,text:'拡張で翻訳された文章です。',changed:true}))};
   return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(result)}]}]});
  };
 });
 const html=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>body{font:15px/1.8 system-ui;background:#fff;color:#17231b;margin:0}main{max-width:580px;margin:auto;border:1px solid #ddd}h1{padding:12px;font-size:20px}[data-testid="tweetText"]{display:block}article{padding:20px;border-bottom:1px solid #ddd;min-height:145px}img{width:240px}a{color:#637169}button{padding:8px}</style></head><body><main><h1>Calm Feed · 動作確認用の架空タイムライン</h1>
 <article data-testid="tweet" id="official"><a href="/demo/status/101"><time>5分前</time></a><div><div data-testid="tweetText" lang="en">Already translated</div><div data-testid="tweetTranslation"><div lang="ja">公式の日本語訳です。</div></div></div></article>
 <article data-testid="tweet" id="foreign"><a href="/demo/status/102"><time>8分前</time></a><div data-testid="tweetText" lang="es">Una bonita mañana.</div></article>
 <article data-testid="tweet" id="image"><a href="/demo/status/103"><time>10分前</time></a><div data-testid="tweetText" lang="ja">今日の写真です。</div><div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/fixture.png" alt="架空の画像"></div></article>
 </main></body></html>`;
 await context.route('https://x.com/**',route=>route.request().url().endsWith('/fixture.webm')?route.fulfill({contentType:'video/webm',body:video}):route.fulfill({contentType:'text/html',body:html}));
 await context.route('https://pbs.twimg.com/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="180"><rect width="400" height="180" fill="#b8ceb0"/><text x="70" y="90" font-size="24">Image fixture</text></svg>'}));
 const page=await context.newPage();await page.goto('https://x.com/home');
 await expect(page.locator('#official')).toHaveAttribute('data-cf-state','processing');
 await expect(page.locator('.cf-row')).toHaveCount(0);
 expect(await page.locator('#official').evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
 await worker.evaluate(()=>{globalThis.testHold=false;globalThis.testReleases.splice(0).forEach(resolve=>resolve());});
 await expect(page.locator('#official')).toHaveAttribute('data-cf-state','allowed',{timeout:20000});
 await expect(page.locator('#official .cf-translation')).toHaveCount(0);
 await expect(page.locator('#foreign .cf-translated')).toHaveText('拡張で翻訳された文章です。');
 await expect(page.locator('#foreign [data-testid="tweetText"]')).not.toBeVisible();
 await expect(page.locator('#image')).toHaveAttribute('data-cf-state','excluded');await expect(page.locator('#image .cf-reason')).toContainText('虫');
 await expect(page.locator('#image>a')).toHaveAttribute('inert','');
 await page.locator('#image').getByRole('button',{name:'Show post',exact:true}).click();await expect(page.locator('#image .cf-row')).toHaveCount(0);await expect(page.locator('#image>a')).not.toHaveAttribute('inert','');await page.locator('#image').getByRole('button',{name:'Collapse again'}).click();await expect(page.locator('#image .cf-row')).toHaveCount(1);
 await expect(page.locator('#image>[data-testid="tweetText"]')).not.toBeVisible();
 expect(await page.locator('#image').evaluate(el=>el.getBoundingClientRect().height)).toBeLessThanOrEqual(26);
 await page.setViewportSize({width:390,height:844});expect(await page.locator('#image').evaluate(el=>el.getBoundingClientRect().height)).toBeLessThanOrEqual(26);
 await page.setViewportSize({width:1024,height:900});
 await page.screenshot({path:'artifacts/timeline-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/timeline-mobile.png',fullPage:true});
 // Only the uncovered Spanish segment may be sent to translation.
 const requests=await worker.evaluate(()=>globalThis.testRequests);const translations=requests.filter(r=>r.body.text?.format.name==='translations');expect(translations).toHaveLength(1);expect(JSON.stringify(translations)).not.toContain('Already translated');
 // A virtualized article reused for another post must not retain its previous verdict.
 await page.locator('#foreign').evaluate(el=>{el.querySelector('a').href='/demo/status/104';el.querySelector('[data-testid="tweetText"]').textContent='Bonjour';});await expect.poll(async()=>worker.evaluate(()=>globalThis.testRequests.filter(r=>r.body.text?.format.name==='translations').length)).toBe(2);
 // Feedback uses only the exact menu action, once per account/post.
 await page.evaluate(()=>{
  const profile=document.createElement('a');profile.dataset.testid='AppTabBar_Profile_Link';profile.href='/fixtureuser';document.body.prepend(profile);
  window.feedbackClicks=0;
  const article=document.createElement('article');article.dataset.testid='tweet';article.id='feedback';article.innerHTML='<a href="/demo/status/110"><time>now</time></a><button data-testid="caret" aria-expanded="false">More</button><div data-testid="tweetText" lang="en">insect</div>';
  const caret=article.querySelector('button');caret.onclick=()=>{const existing=document.querySelector('[role="menu"]');if(existing){existing.remove();caret.setAttribute('aria-expanded','false');return;}const menu=document.createElement('div');menu.setAttribute('role','menu');const item=document.createElement('button');item.setAttribute('role','menuitem');item.textContent='このポストに興味がない';item.onclick=()=>{window.feedbackClicks++;menu.remove();caret.setAttribute('aria-expanded','false');};menu.append(item);document.body.append(menu);caret.setAttribute('aria-expanded','true');};document.querySelector('main').prepend(article);
 });
 await expect.poll(()=>page.evaluate(()=>window.feedbackClicks),{timeout:15000}).toBe(1);
 await settings.locator('#save').click();await expect(page.locator('#feedback')).toHaveAttribute('data-cf-state','excluded',{timeout:15000});
 await expect.poll(()=>worker.evaluate(()=>chrome.storage.local.get('feedback:/fixtureuser:110').then(x=>!!x['feedback:/fixtureuser:110']))).toBe(true);
 expect(await page.evaluate(()=>window.feedbackClicks)).toBe(1);
 await settings.locator('#auto-not-interested').uncheck();await settings.locator('#save').click();
 await settings.reload();await expect(settings.locator('#auto-not-interested')).not.toBeChecked();
 // Content scripts cannot ask for or receive key values.
 const response=await page.evaluate(async()=>({extensionPresent:!!document.querySelector('.cf-ui')}));expect(response.extensionPresent).toBe(true);
 await settings.setViewportSize({width:390,height:844});await settings.locator('#rules .rule').last().locator('input').uncheck();await settings.locator('#save').click();await expect(page.locator('#image')).toHaveAttribute('data-cf-state','allowed',{timeout:20000});
 // Actual video decoding; unjudged audio must not cover the post.
 await page.evaluate(async()=>{const el=document.createElement('article');el.id='video';el.dataset.testid='tweet';el.innerHTML='<a href="/demo/status/106"><time>now</time></a><div data-testid="tweetText" lang="ja">動画</div><div data-testid="videoPlayer"><video muted preload="auto" src="https://x.com/fixture.webm"></video></div>';const v=el.querySelector('video');await new Promise((resolve,reject)=>{v.onloadeddata=resolve;v.onerror=reject;v.load();});document.querySelector('main').prepend(el);});
 await expect(page.locator('#video')).toHaveAttribute('data-cf-state','allowed',{timeout:30000});await expect(page.locator('#video .cf-row')).toHaveCount(0);
 expect(await worker.evaluate(()=>globalThis.testRequests.some(r=>r.body.text?.format.name==='media_evidence'&&r.body.input[0].content.length>=2))).toBe(true);
 // Expand the long post before classifying; never send only the preview.
 await page.evaluate(()=>{const el=document.createElement('article');el.id='long';el.dataset.testid='tweet';el.innerHTML='<a href="/demo/status/107"><time>now</time></a><div data-testid="tweetText" lang="ja">短いプレビュー</div><button data-testid="tweet-text-show-more-link">さらに表示</button>';el.querySelector('button').onclick=()=>{el.querySelector('[data-testid="tweetText"]').textContent='展開後の全文です。';el.querySelector('button').remove();};document.querySelector('main').prepend(el);});
 await expect(page.locator('#long')).toHaveAttribute('data-cf-state','allowed',{timeout:15000});
 expect(await worker.evaluate(()=>globalThis.testRequests.some(r=>r.body.state?.sources?.some(s=>s.text==='展開後の全文です。')))).toBe(true);
 expect(await worker.evaluate(()=>globalThis.testRequests.some(r=>r.body.state?.sources?.some(s=>s.text==='短いプレビュー')))).toBe(false);
 // A loaded post below the viewport is classified before scrolling to it.
 await page.evaluate(()=>{const gap=document.createElement('div');gap.style.height='900px';document.querySelector('main').prepend(gap);const el=document.createElement('article');el.id='prefetch';el.dataset.testid='tweet';el.innerHTML='<a href="/demo/status/108"><time>now</time></a><div data-testid="tweetText" lang="es">Una tarde tranquila en el jardín.</div>';gap.after(el);window.scrollTo(0,0);});
 await expect(page.locator('#prefetch')).toHaveAttribute('data-cf-state','allowed',{timeout:15000});
 await expect(page.locator('#prefetch .cf-translated')).toHaveText('拡張で翻訳された文章です。');
 expect(await page.locator('#prefetch').evaluate(el=>el.getBoundingClientRect().top>innerHeight)).toBe(true);
 // Advertisement metadata follows the same editable/toggleable rule path.
 await page.evaluate(()=>{const el=document.createElement('article');el.id='advert';el.dataset.testid='tweet';el.innerHTML='<a href="/demo/status/109"><time>now</time></a><div><div><span>広告</span></div><button data-testid="caret"></button></div><div data-testid="tweetText" lang="ja">新商品のご案内</div>';document.querySelector('main').prepend(el);});
 await expect(page.locator('#advert')).toHaveAttribute('data-cf-state','excluded',{timeout:15000});
 await expect(page.locator('#advert .cf-reason')).toContainText('広告');
 await settings.locator('#rules .rule').nth(3).locator('input').uncheck();await settings.locator('#save').click();
 await expect(page.locator('#advert')).toHaveAttribute('data-cf-state','allowed',{timeout:15000});
 // Missing key is recoverable and setting a key refreshes existing posts.
 await settings.locator('#credentials summary').click();await settings.locator('[data-delete="jev"]').click();await expect(page.locator('#image')).toHaveAttribute('data-cf-state','error',{timeout:15000});await expect(page.locator('#image .cf-row')).toHaveCount(0);await expect(page.locator('#image>a')).not.toHaveAttribute('inert','');
 await settings.locator('#jev').fill('fixture-jev-key');await settings.locator('#save-keys').click();await expect(page.locator('#image')).toHaveAttribute('data-cf-state','allowed',{timeout:15000});
 // All rules can be deleted and stay deleted after reload.
 while(await settings.locator('#rules .rule').count())await settings.locator('#rules .rule').last().getByRole('button').click();await settings.locator('#save').click();await expect(settings.locator('#status')).toContainText('保存しました');await settings.reload();await expect(settings.locator('#rules .rule')).toHaveCount(0);
 expect(errors).toEqual([]);console.log('Browser checks passed: rule CRUD, masked credentials, official translation reuse, fallback translation, image exclusion, reveal/restore, re-evaluation.');
}finally{await context.close();}
