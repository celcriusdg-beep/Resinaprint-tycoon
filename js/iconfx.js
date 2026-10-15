/* Animated icons (4.6): the rendered 3D icons get life from layered CSS: smoke, bubbles, scan lines, glows, sparks. */
const FX_PARTS={printers:4,resin:5,gear:3,space:4,stores:3,dispatch:3,fleet:4,channels:3,skill:4};
function uiIcon(k,px){
  const n=FX_PARTS[k]||0;let p='';
  for(let i=1;i<=n;i++)p+=`<i class="fp fp${i}"></i>`;
  return `<span class="fx fx-${k}" style="--px:${px||64}px"><img class="uiimg" src="img/ui/${k}.webp" alt="" width="${px||64}" height="${px||64}" loading="lazy">${p}</span>`;
}
