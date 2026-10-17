import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {translate,describeMedia} from '../src/api.js';
import {defaults} from '../src/core.js';
try{
 const key=execFileSync('gopass',['show','-o','personal/openai/api-key'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 const settings=defaults('ja');const text=await translate([{id:'smoke',text:'Good morning. I made a small tool today.',lang:'en'}],settings,key);
 if(!text[0]?.text||!text[0].changed)throw new Error('Translation output missing');
 const screenshot=await readFile('artifacts/settings-mobile.png');
 const evidence=await describeMedia([{source:'image:0',data:`data:image/png;base64,${screenshot.toString('base64')}`}],settings.rules,settings,key);
 if(!evidence[0]?.text)throw new Error('Image evidence missing');
 console.log('OpenAI live smoke passed: Japanese translation and image evidence returned. No credentials stored in project.');
}catch(error){console.error('OpenAI live smoke failed:',error.message?.includes('API')?error.message:'Unable to access credentials or validate output.');process.exitCode=1;}
