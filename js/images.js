/* Real product photos (embedded) and the picture overrides that use them. */
/* ---------- real pictures ---------- */
const PIMG={};/* the Ahri and garage-kit photos now live in assets/official/products */
const RIMG={};
/* Official photos live in assets/official (generated map in js/official.js). If a photo is missing the drawn picture is used. */
const OFF=(typeof OFFICIAL!=='undefined'&&OFFICIAL)||{p:{},f:{}};OFF.r=OFF.r||{};
const _prodArt=prodArt,_printerArt=printerArt;
/* Photos are read into memory once and used as data URIs, so the screen can be rebuilt every few seconds without flicker. */
const OFFDATA={};
const photoTag=(src,fb)=>OFFDATA[src]?`<img src="${OFFDATA[src]}" alt="" decoding="sync" data-ph="1" style="width:100%;height:100%;object-fit:contain;display:block">`:fb;
function preloadOfficial(){
  const paths=[...Object.values(OFF.p),...Object.values(OFF.f),...Object.values(OFF.r)];if(!paths.length)return;
  if(location.protocol==='file:'){paths.forEach(p=>{OFFDATA[p]=p});return}
  Promise.all(paths.map(p=>fetch(p).then(r=>r.ok?r.blob():Promise.reject()).then(b=>new Promise(res=>{const fr=new FileReader();fr.onload=()=>{OFFDATA[p]=fr.result;res()};fr.onerror=res;fr.readAsDataURL(b)})).catch(()=>{})))
    .then(()=>{if(typeof S!=='undefined'&&S&&typeof render==='function'){lastHTML='';render()}});
}
prodArt=function(k){
  if(!OFF.f[k]&&PIMG[k])return `<img src="${PIMG[k]}" alt="" style="width:100%;height:100%;object-fit:cover;object-position:50% 30%;display:block">`;
  return OFF.f[k]?photoTag(OFF.f[k],_prodArt(k)):_prodArt(k)};
printerArt=function(k){
  if(RIMG[k])return `<img src="${RIMG[k]}" alt="" style="width:100%;height:100%;object-fit:contain;display:block">`;
  return OFF.p[k]?photoTag(OFF.p[k],_printerArt(k)):_printerArt(k)};
/* resins: official bottle and cartridge photos; supplies without a photo get the rendered bottle, tinted per kind */
const RESIN_TINT={carbon:'grayscale(.6) brightness(.95)',pj:'hue-rotate(180deg) saturate(.8)',mjp:'hue-rotate(150deg) saturate(.7)',inj:'grayscale(1) brightness(1.15)',lab:'hue-rotate(230deg) saturate(1.6) brightness(1.1)'};
function resinArt(k){
  const R=RESINS[k];if(OFF.r[k]&&OFFDATA[OFF.r[k]])return photoTag(OFF.r[k],'');
  const f=(R&&RESIN_TINT[R.fam])||'none';
  return `<img src="img/ui/resin.webp" alt="" style="width:100%;height:100%;object-fit:contain;display:block;filter:${f}">`;
}
preloadOfficial();
