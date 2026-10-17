import test from 'node:test';import assert from 'node:assert/strict';import {parseHTML} from 'linkedom';
const dom=await import('../src/dom.js').catch(()=>({}));
const article=html=>parseHTML(`<article data-testid="tweet"><a href="/user/status/123"><time>now</time></a>${html}</article>`).document.querySelector('article');
test('extracts text and quotes without media payloads',()=>{
 assert.equal(typeof dom.extractPost,'function');
 const p=dom.extractPost(article('<img src="https://pbs.twimg.com/profile_images/a"><div data-testid="tweetText" lang="en">hello</div><div role="link"><div data-testid="tweetText" lang="es">hola</div></div><div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/x"></div><div class="cf-ui"><div data-testid="tweetText">ignore</div></div>'));
 assert.equal(p.id,'123');assert.equal(p.segments.length,2);assert.equal(p.segments[1].source,'quote:1');assert.equal(p.media,undefined);assert.equal(p.mediaWarnings,undefined);
});
test('official translations attach to original segments and never become quote sources',()=>{
 assert.equal(typeof dom.extractPost,'function');
 const p=dom.extractPost(article('<div><div data-testid="tweetText" lang="en">hello</div><div data-testid="tweetTranslation"><div lang="ja">こんにちは</div></div></div>'));
 assert.equal(p.segments[0].official.text,'こんにちは');assert.equal(p.segments[0].official.lang,'ja');
});
test('truncated posts and unavailable quotes remain incomplete',()=>{
 assert.equal(typeof dom.extractPost,'function');
 const p=dom.extractPost(article('<div data-testid="tweetText">long…</div><button data-testid="tweet-text-show-more-link">Show more</button><div data-testid="tweetUnavailable">unavailable</div>'));
 assert.equal(p.warnings.length,2);
});
test('line breaks and inline emoji remain part of the text sent to AI',()=>{
 const p=dom.extractPost(article('<div data-testid="tweetText" lang="en">Hello<br>world <img alt="🐛" src="https://abs.twimg.com/emoji.svg"></div>'));
 assert.equal(p.segments[0].text,'Hello\nworld 🐛');
});
test('a quote with no outer text remains a quote source',()=>{
 const p=dom.extractPost(article('<div role="link" data-testid="quoteTweet"><div data-testid="tweetText" lang="ja">引用の本文</div></div>'));
 assert.equal(p.segments[0].source,'quote:0');
});
test('X in-place translated text remains available for body and quote checks',async()=>{
 const p=dom.extractPost(article('<div><div>英語からの翻訳<button aria-label="原文を表示">原文を表示</button></div><div data-testid="tweetText" lang="ja">Omarchy が公開されました。</div><div role="link"><div>英語からの翻訳</div><div data-testid="tweetText" lang="ja">Rails の新機能です。</div></div></div>'));
 assert.equal(p.segments.length,2);
 for(const s of p.segments){assert.equal(s.official?.lang,'ja');}
});
test('ordinary Japanese mixed with foreign text is not mistaken for an official translation',()=>{
 const p=dom.extractPost(article('<div><div data-testid="tweetText" lang="ja">日本語 and foreign text</div></div>'));
 assert.equal(p.segments[0].official,undefined);
});
test('automatically expands long text before extraction',async()=>{
 const a=article('<div data-testid="tweetText">短文</div><button data-testid="tweet-text-show-more-link">さらに表示</button>');
 a.querySelector('button').click=()=>{a.querySelector('[data-testid="tweetText"]').textContent='全文の続きに除外対象の内容があります';a.querySelector('button').remove();};
 await dom.expandLongPosts(a);
 assert.match(dom.extractPost(a).segments[0].text,/全文の続き/);assert.equal(dom.extractPost(a).warnings.length,0);
});
test('advertisement badge is metadata, not a word inside ordinary post text',()=>{
 assert.equal(dom.extractPost(article('<div><div><span>広告</span></div><button data-testid="caret"></button></div><div data-testid="tweetText">製品紹介</div>')).promoted,true);
 assert.equal(dom.extractPost(article('<div data-testid="tweetText"><span>広告</span>についての話</div>')).promoted,false);
});

test('media-only posts including unloaded videos do not produce extraction warnings',()=>{
 for(const html of ['<div data-testid="tweetPhoto"><img src="https://invalid.test/x"></div>','<video></video>','<div data-testid="videoPlayer"></div>']){
  const p=dom.extractPost(article(html));assert.deepEqual(p.segments,[]);assert.deepEqual(p.warnings,[]);assert.equal(p.media,undefined);
 }
 assert.equal(dom.sampleVideo,undefined);
});
