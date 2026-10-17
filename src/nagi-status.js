export function nagiStatus(result){
 const detail=[result.error,...(result.warnings||[])].filter(Boolean).join('\n');
 if(result.code==='missing_jev_key')return {text:'Nagi Feed: API key not configured. Add your Jev key in Settings to check posts.',busy:false,detail,setup:true};
 if(result.status==='pending')return {text:'Nagi Feed: Queued',busy:false,detail};
 if(result.status==='processing')return {text:'Nagi Feed: Checking…',busy:true,detail};
 if(result.status==='error')return {text:'Nagi Feed: Could not check this post'+(result.error?' — '+result.error:''),busy:false,detail};
 if(result.status==='excluded')return {text:'Nagi Feed: Checked · Filtered',busy:false,detail};
 if(result.status==='incomplete'||result.uncertain)return {text:'Nagi Feed: Finished · Partially checked (shown)',busy:false,detail:detail||'Shown because a rule match could not be confirmed.'};
 return {text:'Nagi Feed: Checked · No matches',busy:false,detail,complete:true};
}
