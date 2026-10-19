import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {parseHTML} from 'linkedom';
test('credentials are collapsed, masked and not supplied as saved field values',async()=>{
 const html=await readFile(new URL('../src/settings.html',import.meta.url),'utf8').catch(()=>'');const {document}=parseHTML(html);
 assert.ok(document.querySelector('#credentials'),'credential panel exists');
 assert.equal(document.querySelector('#credentials').hasAttribute('open'),false);
 assert.equal(document.querySelectorAll('input[type="password"]').length,1);assert.equal(document.getElementById('openai'),null);
 for(const id of ['jev']){assert.equal(document.getElementById(id).type,'password');assert.equal(document.getElementById(id).getAttribute('value'),null);}
 assert.match(document.querySelector('#new-rule').getAttribute('placeholder'),/text/i);
});
test('key setup explains transmission and links to the public privacy policy',async()=>{
 const {document}=parseHTML(await readFile('src/settings.html','utf8'));
 const credentials=document.querySelector('#credentials');
 assert.match(credentials.textContent,/enabled.*rules.*sent.*TypeSafe/s);
 assert.match(credentials.textContent,/charges/i);
 assert.equal(credentials.querySelector('a').getAttribute('href'),'https://github.com/komagata/nagi-feed/blob/main/PRIVACY.md');
});
