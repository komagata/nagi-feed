const labels=new Set(['このポストに興味がない','このツイートに興味がない','Not interested in this post','Not interested in this Tweet']);
export function feedbackEligible(post,result,settings){
 return settings.enabled&&settings.autoNotInterested&&/^\d+$/.test(post.id)&&!post.promoted&&result.status==='excluded'&&result.matches?.some(m=>m.source!=='advertisement'&&m.ruleId!=='ads');
}
export async function sendNotInterested(article,{document,valid,claim,wait=ms=>new Promise(r=>setTimeout(r,ms))}){
 if(!valid()||document.querySelector('[role="menu"],[role="dialog"]'))return false;
 const caret=article.querySelector('[data-testid="caret"]');if(!caret)return false;
 // Only temporarily release the inert ancestors set by our own overlay.
 const ancestors=[];let node=caret;
 while(node&&node!==article){if(node.hasAttribute('data-cf-inert')){ancestors.push(node);node.inert=false;}node=node.parentElement;}
 let clicked=false,interrupted=false;
 const previousValid=valid;valid=()=>!interrupted&&previousValid();
 const interrupt=event=>{if(event.isTrusted)interrupted=true;};
 document.addEventListener('pointerdown',interrupt,true);document.addEventListener('keydown',interrupt,true);
 try{
  if(!valid())return false;
  caret.click();
  for(let i=0;i<15;i++){
   if(!valid())break;
   const menus=[...document.querySelectorAll('[role="menu"]')];
   if(menus.length===1&&caret.getAttribute('aria-expanded')==='true'){
    const item=[...menus[0].querySelectorAll('[role="menuitem"]')].find(n=>labels.has(n.textContent.trim()));
    if(!item)break;
    if(await claim()&&valid()&&caret.getAttribute('aria-expanded')==='true'&&menus[0].contains(item)){
     item.click();clicked=true;
    }
    break;
   }
   await wait(100);
  }
 }finally{
  // Close only the menu opened from this post; never select a different action.
  document.removeEventListener('pointerdown',interrupt,true);document.removeEventListener('keydown',interrupt,true);
  if(!clicked&&!interrupted&&caret.getAttribute('aria-expanded')==='true')caret.click();
  for(const ancestor of ancestors)if(ancestor.hasAttribute('data-cf-inert'))ancestor.inert=true;
 }
 return clicked;
}
