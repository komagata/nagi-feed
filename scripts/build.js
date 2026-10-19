import {build} from 'esbuild';
import {mkdir,writeFile,copyFile,readFile} from 'node:fs/promises';
const {version}=JSON.parse(await readFile('package.json','utf8'));
for(const browser of ['chrome','firefox']){
 const out=`dist/${browser}`;await mkdir(out,{recursive:true});
 await build({entryPoints:['src/background.js','src/content.js','src/settings.js'],outdir:out,bundle:true,format:'iife',target:['chrome120','firefox128'],legalComments:'none'});
 for(const file of ['settings.html','settings.css','content.css'])await copyFile(`src/${file}`,`${out}/${file}`);
 const icons=Object.fromEntries([16,32,48,128].map(size=>[size,`icon-${size}.png`]));
 for(const name of Object.values(icons))await copyFile(`assets/icons/${name}`,`${out}/${name}`);
 const manifest={manifest_version:3,name:'Nagi Feed',version,description:'Filter X posts using your own content rules.',homepage_url:'https://github.com/komagata/nagi-feed',icons,permissions:['storage'],host_permissions:['https://x.com/*','https://twitter.com/*','https://api.typesafe.ai/*'],action:{default_icon:icons,default_title:'Nagi Feed',default_popup:'settings.html'},options_ui:{page:'settings.html',open_in_tab:true},content_scripts:[{matches:['https://x.com/*','https://twitter.com/*'],js:['content.js'],css:['content.css'],run_at:'document_start'}],background:browser==='chrome'?{service_worker:'background.js'}:{scripts:['background.js']},content_security_policy:{extension_pages:"script-src 'self'; object-src 'none'"}};
 if(browser==='firefox')manifest.browser_specific_settings={gecko:{id:'nagi-feed@komagata.org',strict_min_version:'128.0'},gecko_android:{strict_min_version:'128.0'}};
 await writeFile(`${out}/manifest.json`,JSON.stringify(manifest,null,2));
}
console.log('Built Nagi Feed for Chrome and Firefox.');
