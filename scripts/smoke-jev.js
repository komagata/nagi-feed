import {execFileSync} from 'node:child_process';
import {classify,translationCandidates} from '../src/api.js';

try {
 const key=execFileSync('gopass',['show','-o','personal/typesafe/api-key'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 const rule={id:'insects',text:'虫の写真や動画を含む投稿。文章で触れるだけなら除外しない。',enabled:true};
 const excluded=await classify([{source:'image:0',text:'A close-up photograph of a caterpillar on a green leaf.'}],[rule],key);
 const allowed=await classify([{source:'body',text:'今日は虫について本で調べました。写真や動画はありません。'}],[rule],key);
 if(!excluded.matches.some(m=>m.ruleId===rule.id)||allowed.matches.length||allowed.uncertain)throw new Error('Unexpected classification');
 const selected=await translationCandidates([{id:'ja',text:'AnkerのUVプリンター見てきたえっぐい',lang:'en'},{id:'es',text:'Hoy caminé por un jardín tranquilo.',lang:'ja'},{id:'ko',text:'오늘은 날씨가 좋습니다.'},{id:'zh',text:'今天天气很好。'},{id:'mixed',text:'新機能です。This is a new feature.'}],'ja',key);
 if(JSON.stringify(selected.map(s=>s.id))!==JSON.stringify(['es','ko','zh','mixed']))throw new Error('Unexpected language classification');
 console.log('Jev language check passed: Japanese brand names skipped; Spanish, Korean, Chinese and mixed prose selected.');
 console.log('Jev live smoke passed: insect photo evidence excluded; text-only mention allowed.');
} catch(error) {
 console.error('Jev live smoke failed:',/^APIエラー（\d+）/.test(error.message||'')?error.message:'Unable to access credentials, connect, or validate classification.');
 process.exitCode=1;
}
