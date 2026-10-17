export function textNodes(article){return [...article.querySelectorAll('[data-testid="tweetText"]')].filter(n=>!n.closest('.cf-ui,[data-testid="tweetTranslation"]'));}
function readableText(node){const copy=node.cloneNode(true);copy.querySelectorAll('br').forEach(n=>n.replaceWith('\n'));copy.querySelectorAll('img[alt]').forEach(n=>n.replaceWith(n.getAttribute('alt')));return copy.textContent.trim();}
function officialFor(node){
 // X changes its DOM regularly. Only reuse translations with an explicit language.
 // Current X replaces tweetText in place; the translation notice is its sibling,
 // including in quotes where there is no "Show original" button.
 const notice=node.previousElementSibling;
 const label=notice?.textContent.trim()||'';
 if(node.getAttribute('lang')&&notice&&!notice.querySelector('[data-testid="tweetText"]')&&/^(?:.{1,40}からの翻訳|Translated from\s+.{1,40})(?:原文を表示|Show original)?$/u.test(label))return {text:readableText(node),lang:node.getAttribute('lang')};
 const parent=node.parentElement;
 const translation=parent?.querySelector('[data-testid="tweetTranslation"]');
 if(translation){const target=translation.hasAttribute('lang')?translation:translation.querySelector('[lang]');if(target?.textContent.trim())return {text:readableText(target),lang:target.getAttribute('lang')};}
 return undefined;
}
export async function expandLongPosts(article){
 for(const control of article.querySelectorAll('[data-testid="tweet-text-show-more-link"]')){
  if(control.closest('.cf-ui'))continue;
  // Use X's own inline expansion; never navigate away from the timeline.
  if(control.tagName==='A'&&control.getAttribute('href'))continue;
  control.click();
  for(let i=0;i<30&&article.contains(control);i++)await new Promise(r=>setTimeout(r,100));
 }
}
export function extractPost(article){
 const time=article.querySelector('time');const href=time?.closest('a')?.getAttribute('href')||article.querySelector('a[href*="/status/"]')?.getAttribute('href')||'';
 const id=href.match(/\/status\/(\d+)/)?.[1]||'';
 const nodes=textNodes(article);const segments=nodes.map((n,i)=>({id:String(i),text:readableText(n),lang:n.getAttribute('lang')||'',source:n.closest('[data-testid="quoteTweet"],div[role="link"]')||i>0?`quote:${i}`:'body',official:officialFor(n)}));
 const warnings=[];
 const promoted=[...article.querySelectorAll('span')].some(n=>{
  if(n.closest('[data-testid="tweetText"],[data-testid="User-Name"],[data-testid="quoteTweet"],div[role="link"],.cf-ui')||!/^(広告|プロモーション|Ad|Promoted|Sponsored)$/.test(n.textContent.trim()))return false;
  const header=n.parentElement?.parentElement;
  return !!header?.querySelector('[data-testid="caret"]')&&!header.querySelector('[data-testid="tweetText"]');
 });
 if(article.querySelector('[data-testid="tweet-text-show-more-link"]'))warnings.push('Could not load the full post. You can try again.');
 if(article.querySelector('[data-testid="tweetUnavailable"]'))warnings.push('Could not load the quoted post.');
 // Media-only posts have no text to check and remain visible.
 if(!segments.length&&!article.querySelector('[data-testid="tweetPhoto"],[data-testid="videoPlayer"],video'))warnings.push('Could not read this post.');
 return {id,segments,warnings,promoted};
}
