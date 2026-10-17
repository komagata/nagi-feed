// Extension-origin IndexedDB is not shared with content scripts running on X.
let database;
function open(){
 return database??=new Promise((resolve,reject)=>{
  const request=indexedDB.open('calm-feed-credentials',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('credentials');
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(new Error('Could not open API key storage.'));
 });
}
async function transaction(mode,operation){
 const db=await open();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('credentials',mode),request=operation(tx.objectStore('credentials'));
  tx.oncomplete=()=>resolve(request.result);
  tx.onerror=tx.onabort=()=>reject(new Error('Could not save or load API keys.'));
 });
}
function jevOnly(keys){return typeof keys?.jev==='string'?{jev:keys.jev}:{};}
export async function readKeys(){return jevOnly(await transaction('readonly',s=>s.get('keys')));}
export async function writeKeys(keys){await transaction('readwrite',s=>s.put(jevOnly(keys),'keys'));}
export async function migrateSessionKeys(api){
 const legacy=(await api.storage.session.get('keys')).keys;
 if(!legacy)return;
 const current=await readKeys();
 await writeKeys({...jevOnly(legacy),...current});
 await api.storage.session.remove('keys');
}
