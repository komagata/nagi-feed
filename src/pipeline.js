import {classify} from './api.js';
import {advertisementDecision,isAdvertisementRule} from './core.js';
export async function analyze(post,settings,keys,deps={}){
 const advertisement=advertisementDecision(post,settings);if(advertisement)return advertisement;
 const rules=settings.rules.filter(r=>r.enabled&&!isAdvertisementRule(r)),warnings=[...(post.warnings||[])];
 const sources=post.segments.filter(s=>s.text.trim()).map(s=>({source:s.source,text:s.text}));
 let decision={matches:[],uncertain:false};
 if(rules.length&&sources.length){
  if(!keys.jev)throw Object.assign(new Error('Your Jev API key is not configured. Add it in Settings.'),{code:'missing_jev_key'});
  decision=await (deps.classify||classify)(sources,rules,keys.jev);
 }
 if(decision.matches.length)return {status:'excluded',...decision,warnings,translations:[]};
 return {status:warnings.length?'incomplete':'allowed',...decision,warnings,translations:[]};
}
