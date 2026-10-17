import {filters} from './product.js';
const api=globalThis.browser||chrome;
const $=id=>document.getElementById(id);let settings;
async function send(message){const result=await api.runtime.sendMessage(message);if(result?.error)throw new Error(result.error);return result;}
function status(text,key=false){$(key?'key-status':'status').textContent=text;}
function drawRules(){
 $('rules').replaceChildren();settings.rules.forEach((rule,index)=>{
  const row=document.createElement('div');row.className='rule';
  const enabled=document.createElement('input');enabled.type='checkbox';enabled.checked=rule.enabled;enabled.setAttribute('aria-label',`Enable rule ${index+1}`);enabled.addEventListener('change',()=>{rule.enabled=enabled.checked;status('You have unsaved changes.');});
  const text=document.createElement('textarea');text.rows=3;text.maxLength=1000;text.value=rule.text;text.setAttribute('aria-label',`Rule ${index+1} text`);text.addEventListener('input',()=>{rule.text=text.value;status('You have unsaved changes.');});
  const remove=document.createElement('button');remove.type='button';remove.textContent='Delete';remove.setAttribute('aria-label',`Delete rule ${index+1}`);remove.addEventListener('click',()=>{settings.rules.splice(index,1);drawRules();status('You have unsaved changes.');});row.append(enabled,text,remove);$('rules').append(row);
 });
}
function keyStatus(configured){$('setup-guide').hidden=configured.jev;$('jev-status').textContent=configured.jev?'Configured':'Not configured';}
function mask(){for(const b of document.querySelectorAll('[data-reveal]')){$(b.dataset.reveal).type='password';b.textContent='Show';b.setAttribute('aria-pressed','false');}}
document.querySelectorAll('[data-reveal]').forEach(b=>b.addEventListener('click',()=>{const field=$(b.dataset.reveal),show=field.type==='password';field.type=show?'text':'password';b.textContent=show?'Hide':'Show';b.setAttribute('aria-pressed',String(show));}));
window.addEventListener('blur',mask);document.addEventListener('visibilitychange',()=>{if(document.hidden)mask();});$('credentials').addEventListener('toggle',()=>{if(!$('credentials').open)mask();});
$('add-rule').addEventListener('submit',e=>{e.preventDefault();if(!settings)return;const text=$('new-rule').value.trim();if(!text){$('new-rule').focus();return;}if(settings.rules.length>=30){status('You can add up to 30 rules.');return;}settings.rules.push({id:crypto.randomUUID(),text,enabled:true});$('new-rule').value='';drawRules();status('Rule added. Save to apply your changes.');});
$('save').addEventListener('click',async()=>{if(!settings)return;$('save').disabled=true;try{settings.enabled=$('enabled').checked;settings.autoNotInterested=filters&&$('auto-not-interested').checked;settings=(await send({type:'settings:save',settings})).settings;drawRules();status('Settings saved and applied to open X tabs.');}catch(e){status(e.message);}finally{$('save').disabled=false;}});
$('save-keys').addEventListener('click',async()=>{const keys={};for(const k of ['jev'])if($(k).value.trim())keys[k]=$(k).value.trim();if(!Object.keys(keys).length){status('Enter an API key to save.',true);return;}$('save-keys').disabled=true;try{keyStatus((await send({type:'keys:save',keys})).configured);for(const k of Object.keys(keys))$(k).value='';mask();status('API key saved. It will remain available after restarting your browser.',true);}catch(e){status(e.message,true);}finally{$('save-keys').disabled=false;}});
document.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',async()=>{try{keyStatus((await send({type:'keys:save',keys:{[b.dataset.delete]:''}})).configured);$(b.dataset.delete).value='';mask();status('API key deleted.',true);}catch(e){status(e.message,true);}}));
async function load(){try{const result=await send({type:'settings:get'});settings=result.settings;keyStatus(result.configured);$('enabled').checked=settings.enabled;$('auto-not-interested').checked=settings.autoNotInterested;drawRules();}catch(e){status(e.message);}}
load();

if(!filters){$('rules').closest('section').hidden=true;$('auto-not-interested').closest('section').hidden=true;}


$('setup-keys').addEventListener('click',()=>{$('credentials').open=true;$('credentials').scrollIntoView({block:'start'});$('jev').focus();});
