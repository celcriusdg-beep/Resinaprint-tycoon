/* Animated icons (4.6): the rendered 3D icons get life from layered CSS: smoke, bubbles, scan lines, glows, sparks. */
const FX_PARTS={printers:4,resin:5,gear:3,space:4,stores:3,dispatch:3,fleet:4,channels:3,skill:4};
function uiIcon(k,px){
  const n=FX_PARTS[k]||0;let p='';
  for(let i=1;i<=n;i++)p+=`<i class="fp fp${i}"></i>`;
  return `<span class="fx fx-${k}" style="--px:${px||64}px"><img class="uiimg" src="img/ui/${k}.webp" alt="" width="${px||64}" height="${px||64}" loading="lazy">${p}</span>`;
}
/* 4.12: real product photos for the wash and paint stations (your own wash & cure machine, an Army Painter starter kit) */
const WASH_IMG={bucket:'mercury',mercury:'mercury',acplus:'acplus',wcmax:'wcmax',formwc:'formwc',formwcl:'formwcl',line:'formwcl',postpro:'formwcl'};
const washImg=k=>`img/ui/wash-${WASH_IMG[k]||'mercury'}.webp`;
function washIcon(){return `<span class="fx fx-wash" style="--px:52px"><img class="uiimg" src="${washImg(S.washer)}" alt="" width="52" height="52"><i class="fp fp1"></i><i class="fp fp2"></i><i class="fp fp3"></i></span>`}
function paintIcon(){return `<span class="fx fx-paint" style="--px:56px"><img class="uiimg" src="img/ui/paint.webp" alt="" width="56" height="56"><i class="fp fp1"></i><i class="fp fp2"></i></span>`}
