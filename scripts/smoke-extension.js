// Isolated extension test. Only fictional posts are sent to the real APIs.
import {chromium,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {mkdir} from 'node:fs/promises';

let context;
try {
 const secret=path=>execFileSync('gopass',['show','-o',path],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 const keys={jev:secret('personal/typesafe/api-key'),openai:secret('personal/openai/api-key')};
 const extension=resolve('dist/chrome');
 context=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,locale:'ja-JP',viewport:{width:900,height:900},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
 const id=new URL(worker.url()).hostname;
 const settings=await context.newPage();await settings.goto(`chrome-extension://${id}/settings.html`);
 const saved=await settings.evaluate(async keys=>{
  const result=await chrome.runtime.sendMessage({type:'keys:save',keys});
  if(result.error)return false;
  const {settings}=await chrome.runtime.sendMessage({type:'settings:get'});
  settings.targetLanguage='ja';settings.rules=[{id:'banana',text:'バナナについて述べている投稿。',enabled:true}];
  const update=await chrome.runtime.sendMessage({type:'settings:save',settings});
  return !update.error&&result.configured.jev&&result.configured.openai;
 },keys);
 keys.jev='';keys.openai='';
 if(!saved)throw new Error('Settings setup failed');
 const html=`<!doctype html><html lang="ja"><meta charset="utf-8"><style>body{font:16px/1.8 system-ui;max-width:600px;margin:30px auto}article{padding:24px;min-height:120px;border:1px solid #ddd}</style><h1>Calm Feed — 実API動作確認</h1>
 <article data-testid="tweet" id="excluded"><a href="/fixture/status/801"><time>テスト1</time></a><div data-testid="tweetText" lang="ja">今日のおやつはバナナです。</div></article>
 <article data-testid="tweet" id="translated"><a href="/fixture/status/802"><time>テスト2</time></a><div data-testid="tweetText" lang="es">Hoy caminé por un jardín tranquilo.</div></article>
 <article data-testid="tweet" id="official"><a href="/fixture/status/803"><time>テスト3</time></a><div><div>英語からの翻訳<button>原文を表示</button></div><div data-testid="tweetText" lang="ja">Rails の本を読みました。</div></div></article></html>`;
 await context.route('https://x.com/**',route=>route.fulfill({contentType:'text/html',body:html}));
 const page=await context.newPage();await page.goto('https://x.com/home');
 await expect(page.locator('#excluded')).toHaveAttribute('data-cf-state','excluded',{timeout:120000});
 await expect(page.locator('#excluded .cf-reason')).toContainText('バナナ');
 await expect(page.locator('#translated')).toHaveAttribute('data-cf-state','allowed',{timeout:120000});
 await expect(page.locator('#translated .cf-translated')).toContainText(/[\p{Script=Hiragana}\p{Script=Han}]/u);
 await expect(page.locator('#official')).toHaveAttribute('data-cf-state','allowed',{timeout:120000});
 await expect(page.locator('#official .cf-translation')).toHaveCount(0);
 await mkdir('artifacts',{recursive:true});
 await page.screenshot({path:'artifacts/live-api-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'artifacts/live-api-mobile.png',fullPage:true});
 console.log('Live extension passed: real Jev exclusion, real OpenAI Spanish-to-Japanese translation, official translation reuse.');
} catch {
 // Never print Playwright arguments or credential-bearing exception details.
 console.error('Live extension check failed. No credentials or request arguments logged.');
 process.exitCode=1;
} finally {await context?.close();}
