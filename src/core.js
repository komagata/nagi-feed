export const AD_RULE_TEXT='Posts labeled as ads or promoted posts by X. Do not filter ordinary posts that merely discuss advertising.';
const legacyRules={anger:['強い怒りや敵意を含む投稿。'],mockery:['人や集団への嘲り・侮辱を含む投稿。'],sexual:['性的な内容を含む投稿。'],ads:['Xが広告・プロモーションとして表示している投稿。','Xが広告・プロモーションとして表示している投稿。広告について話しているだけの通常の投稿は除外しない。']};
export function isAdvertisementRule(rule){return [AD_RULE_TEXT,...legacyRules.ads].includes(rule.text);}
export function advertisementDecision(post,settings){
 const rule=settings.rules.find(r=>r.enabled&&isAdvertisementRule(r));
 if(!post.promoted||!rule)return null;
 return {status:'excluded',matches:[{ruleId:rule.id,text:rule.text,source:'advertisement'}],uncertain:false,warnings:[],translations:[]};
}
export function defaults() {
 return {enabled:true,autoNotInterested:true,rules:[
  {id:'anger',text:'Post text expressing strong anger or hostility.',enabled:true},
  {id:'mockery',text:'Post text mocking or insulting people or groups.',enabled:true},
  {id:'sexual',text:'Post text containing sexual content.',enabled:true},
  {id:'ads',text:AD_RULE_TEXT,enabled:true}
 ]};
}
export function normalizeSettings(value={},locale='ja') {
 const d=defaults(locale); const rules=Array.isArray(value.rules)?value.rules:d.rules;
 if(rules.length>30)throw new Error('You can add up to 30 rules.');
 const ids=new Set();
 const normalized=rules.map(r=>{
  if(typeof r.id!=='string'||!r.id||ids.has(r.id)||typeof r.text!=='string'||!r.text.trim()||r.text.length>1000)throw new Error('Check the rule text.');
  ids.add(r.id);return {id:r.id,text:legacyRules[r.id]?.includes(r.text.trim())?d.rules.find(rule=>rule.id===r.id).text:r.text.trim(),enabled:r.enabled!==false};
 });
 return {enabled:value.enabled!==false,autoNotInterested:value.autoNotInterested!==false,rules:normalized};
}
export function cacheKey(post,settings){return JSON.stringify([post.id,post.segments,post.promoted,post.warnings,settings.rules.filter(r=>r.enabled)]);}
export function parseDecisions(result,questions){
 const matches=[];let uncertain=false;
 for(const q of questions){const score=result?.answers?.[q.key]?.noul;
  if(typeof score!=='number'||!Number.isFinite(score)||score<0||score>1)throw new Error('Jev returned an incomplete rule result.');
  if(score>=0.7)matches.push({ruleId:q.ruleId,text:q.text,source:q.source});else if(score>0.3)uncertain=true;
 }return {matches,uncertain};
}
export function sourceLabel(source){if(source==='advertisement')return 'X ad label';if(source.startsWith('quote'))return 'Quoted post';return 'Post text';}
