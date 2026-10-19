// Run ONLY through omabox. Uses a throwaway profile, fake posts and a fake key.
import {chromium,expect} from '@playwright/test';
import {resolve,join} from 'node:path';
import {mkdtemp,mkdir,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
if(process.env.OMABOX!=='1'||!process.env.OMABOX_NAME)throw new Error('Run this capture through omabox; see store/SUBMISSION.md.');
const output=resolve(process.argv[2]||'store/assets');
await mkdir(output,{recursive:true});
const extension=resolve('dist/chrome');
const profile=await mkdtemp(join(tmpdir(),'nagi-store-demo-'));
let context;
try{
 context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,locale:'en-US',colorScheme:'dark',viewport:{width:1280,height:800},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`,'--disable-background-networking']});
 const unexpected=[];
 await context.route('**/*',async route=>{
  const request=route.request();
  if(request.url()==='https://x.com/home'&&request.isNavigationRequest())return route.fulfill({contentType:'text/html',body:await readFile('store/demo.html','utf8')});
  if(request.url().startsWith('chrome-extension://'))return route.continue();
  unexpected.push(request.url());await route.abort('blockedbyclient');
 });
 const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
 await worker.evaluate(()=>{
  globalThis.demoCalls=[];globalThis.demoUnexpected=[];
  globalThis.fetch=async(url,init)=>{
   if(url!=='https://api.typesafe.ai/v1/systemone'){demoUnexpected.push(String(url));throw new Error('Unexpected network request');}
   if(init.headers.Authorization!=='Bearer nagi-store-demo-not-a-real-key')throw new Error('Only the fake demo key is permitted');
   const body=JSON.parse(init.body);demoCalls.push(body);
   const answers={};
   for(const [key,q] of Object.entries(body.questions)){
    const index=Number(q.instructions.question.match(/sources\[(\d+)\]/)[1]);
    answers[key]={noul:body.state.sources[index].text.includes('fools')&&q.instructions.rule.includes('mocking')?.99:.01};
   }
   return Response.json({answers});
  };
 });
 const id=new URL(worker.url()).hostname;
 const settings=await context.newPage();
 await settings.goto(`chrome-extension://${id}/settings.html`);
 await expect(settings.locator('#rules .rule')).toHaveCount(4);
 // Preserve the actual defaults, including optional Not interested. The fixture has
 // no signed-in profile link or feedback menu, so no feedback can be sent to X.
 await settings.locator('#credentials summary').click();
 await settings.locator('#jev').fill('nagi-store-demo-not-a-real-key');
 await settings.locator('#save-keys').click();
 await expect(settings.locator('#jev-status')).toHaveText('Configured');
 await expect(settings.locator('#jev')).toHaveValue('');
 await settings.locator('#credentials summary').click();
 const feed=await context.newPage();await feed.goto('https://x.com/home');
 await expect(feed.locator('#calm')).toHaveAttribute('data-cf-state','allowed');
 await expect(feed.locator('#matched .cf-row')).toBeVisible();
 await expect(feed.locator('#ad .cf-row')).toBeVisible();
 await expect(feed.locator('#calm .cf-complete')).toHaveText('凪✓');
 const placement=await feed.locator('#calm').evaluate(el=>({mark:el.querySelector('.cf-mark').getBoundingClientRect().right,grok:el.querySelector('[aria-label="Grok actions"]').getBoundingClientRect().left}));
 expect(placement.mark).toBeLessThanOrEqual(placement.grok);
 await feed.screenshot({path:join(output,'01-feed-1280x800.png')});
 await feed.locator('#matched .cf-row').click();
 await expect(feed.locator('#matched .cf-restore button')).toHaveText('Collapse again');
 await feed.screenshot({path:join(output,'02-reveal-1280x800.png')});
 await settings.bringToFront();await settings.evaluate(()=>scrollTo(0,0));
 await expect(settings.locator('#credentials')).not.toHaveAttribute('open','');
 await settings.screenshot({path:join(output,'03-settings-1280x800.png')});
 await settings.locator('#credentials summary').click();
 await settings.locator('#credentials').scrollIntoViewIfNeeded();
 await expect(settings.locator('#jev')).toHaveValue('');
 await expect(settings.locator('#jev')).toHaveAttribute('type','password');
 await settings.screenshot({path:join(output,'04-privacy-1280x800.png')});
 expect(unexpected).toEqual([]);
 const evidence=await worker.evaluate(()=>({calls:demoCalls.length,unexpected:demoUnexpected}));
 expect(evidence.calls).toBeGreaterThan(0);expect(evidence.unexpected).toEqual([]);
 const promo=await context.newPage();await promo.setViewportSize({width:440,height:280});
 await promo.setContent(`<style>body{margin:0}svg{display:block}</style>${await readFile('store/assets/promo.svg','utf8')}`);
 await promo.screenshot({path:join(output,'promo-440x280.png')});
 console.log(JSON.stringify({output,screenshots:'1280x800',promo:'440x280',fictionalPosts:true,fakeKeyOnly:true,mockedJevCalls:evidence.calls,unexpectedNetwork:unexpected},null,2));
}finally{
 await context?.close();await rm(profile,{recursive:true,force:true});
}
