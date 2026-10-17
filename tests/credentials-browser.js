import {chromium,expect} from '@playwright/test';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const profile=await mkdtemp(join(tmpdir(),'calm-feed-keys-'));
const extension=resolve('dist/chrome');let context;
async function start(){
 context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
 const page=await context.newPage();await page.goto(`chrome-extension://${new URL(worker.url()).hostname}/settings.html`);
 return {page,worker};
}
try{
 let {page}=await start();
 await page.locator('#credentials summary').click();
 await page.locator('#jev').fill('persistent-fixture-jev');await page.locator('#openai').fill('persistent-fixture-openai');await page.locator('#save-keys').click();await expect(page.locator('#jev-status')).toHaveText('Configured');
 await context.close();
 ({page}=await start());
 await expect(page.locator('#jev-status')).toHaveText('Configured');await expect(page.locator('#openai-status')).toHaveText('Configured');
 await expect(page.locator('#jev')).toHaveValue('');await expect(page.locator('#openai')).toHaveValue('');
 const response=await page.evaluate(()=>chrome.runtime.sendMessage({type:'settings:get'}));
 expect(JSON.stringify(response)).not.toContain('persistent-fixture');
 const local=await page.evaluate(()=>chrome.storage.local.get(null));expect(local.keys).toBeUndefined();
 await page.locator('#credentials summary').click();await page.locator('[data-delete="jev"]').click();await expect(page.locator('#jev-status')).toHaveText('Not configured');
 await context.close();({page}=await start());
 await expect(page.locator('#jev-status')).toHaveText('Not configured');await expect(page.locator('#openai-status')).toHaveText('Configured');
 console.log('Credential persistence passed: restart, deletion, no secret readback, no content-accessible storage.');
}finally{await context?.close();await rm(profile,{recursive:true,force:true});}
