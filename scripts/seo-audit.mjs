const base=(process.argv[2]||'http://localhost:4321').replace(/\/$/,'');
// Usage: node scripts/seo-audit.mjs http://localhost:4321  (title <= 60, description 120-160 flagged with !, keyword counts K1..K7)
const KEYS=['chatgpt ai photo editing prompts','chatgpt photo editing prompts','chatgpt photo editing prompts trending instagram','chatgpt prompt for photo editing','prompt seen chatgpt','chatgpt photo editing prompts text','couple prompt chatgpt'];
const dec=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&#x27;/g,"'");
const sm=await (await fetch(base+'/sitemap.xml')).text();
const paths=[...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>new URL(m[1]).pathname);
console.log('path'.padEnd(62),'title desc | K1 K2 K3 K4 K5 K6 K7');
for(const p of paths){
  const h=await (await fetch(base+p)).text();
  const t=dec((h.match(/<title>([\s\S]*?)<\/title>/)||[])[1]||'');
  const d=dec((h.match(/<meta name="description" content="([^"]*)"/)||[])[1]||'');
  const body=(h.match(/<main[\s\S]*?<\/main>/i)||[h])[0].replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ');
  const txt=dec(body).replace(/\s+/g,' ').toLowerCase();
  const c=KEYS.map(k=>(txt.match(new RegExp(k.replace(/ /g,'\\s+'),'g'))||[]).length);
  console.log(p.padEnd(62),String(t.length).padStart(3)+(t.length>60?'!':' '),String(d.length).padStart(3)+((d.length>160||d.length<120)?'!':' '),'|',c.map(n=>String(n).padStart(2)).join(' '));
}
