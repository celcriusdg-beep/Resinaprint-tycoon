/* Space looks (4.1): each workspace level has its own wall, lighting and floor, so moving up is visible. */
function skyColors(h){return h<5||h>=21?['#0f1233','#2b2f6e']:h<8?['#f4a860','#ffd9a0']:h<17?['#6fb4ee','#cfeaff']:h<20?['#e57f5b','#ffc48a']:['#38306b','#8a5aa8']}
const winHTML=(cls)=>`<div class="win ${cls||''}" style="background:${skyFor(S.hour)}">${S.hour>=21||S.hour<5?'<i class="moon"></i>':'<i class="sun"></i>'}</div>`;
const SKY=h=>{const k=skyColors(h);return `<stop offset="0" stop-color="${k[0]}"/><stop offset="1" stop-color="${k[1]}"/>`};
const night=()=>S.hour>=20||S.hour<6;
function skylineSVG(){
  const b=[[0,70,26],[26,52,20],[46,86,22],[68,60,18],[86,98,26],[112,66,20],[132,80,24],[156,50,18],[174,92,24],[198,62,20],[218,84,26],[244,56,18],[262,96,22],[284,64,24],[308,78,20],[328,58,32]];
  const lights=night();let o='';
  b.forEach((r,i)=>{o+=`<rect x="${r[0]}" y="${150-r[1]}" width="${r[2]}" height="${r[1]}" fill="${lights?'#0c0d14':'#3b4256'}" opacity="${lights?1:.55}"/>`;
    if(lights)for(let k=0;k<5;k++)if((i*7+k*3)%4!==0)o+=`<rect class="tw" style="animation-delay:${((i+k)%5)*.7}s" x="${r[0]+4+(k%2)*8}" y="${150-r[1]+8+Math.floor(k/2)*14}" width="3" height="4" fill="#e8b34b"/>`});
  return o;
}
function wallDeco(ws){
  const sky=SKY(S.hour);
  const open='<svg class="wallart" viewBox="0 0 360 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">',close='</svg>';
  if(ws===0)return open+`<g class="bulb"><path d="M120 0V30" stroke="#0c0d10" stroke-width="2"/><circle cx="120" cy="38" r="40" fill="url(#g0)" opacity=".9"/><circle cx="120" cy="36" r="6" fill="#ffe9a8"/><rect x="116" y="28" width="8" height="6" fill="#3a3d47"/></g>
    <defs><radialGradient id="g0"><stop offset="0" stop-color="#e8b34b" stop-opacity=".35"/><stop offset="1" stop-color="#e8b34b" stop-opacity="0"/></radialGradient></defs>
    <rect x="6" y="94" width="40" height="30" fill="#2b2620" stroke="#0c0d10"/><path d="M6 108h40M26 94v30" stroke="#0c0d10" stroke-width="1.5" opacity=".6"/><rect x="14" y="76" width="30" height="18" fill="#312a22" stroke="#0c0d10"/>
    ><rect x="150" y="116" width="60" height="5" rx="2" fill="#0c0d10" opacity=".5"/>`+close;
  if(ws===1)return winHTML('w1')+open+`<defs><radialGradient id="g1"><stop offset="0" stop-color="#e8b34b" stop-opacity=".3"/><stop offset="1" stop-color="#e8b34b" stop-opacity="0"/></radialGradient></defs>
    <path d="M168 0V24" stroke="#0c0d10" stroke-width="2"/><path d="M156 24h24l-4 12h-16z" fill="#2c2f38" stroke="#0c0d10"/><circle cx="168" cy="40" r="34" fill="url(#g1)"/>
    <rect x="196" y="40" width="26" height="34" fill="#15161b" stroke="#3a3d47" stroke-width="2"/><path d="M200 66l7-10 6 6 5-8 3 8" stroke="#8a8f9d" stroke-width="1.5" fill="none" opacity=".7"/>
    <path d="M22 130c-4-12-2-22 6-28 0 10 4 18 4 28zM38 130c2-12 8-20 16-22-4 10-6 16-6 22z" fill="#2f4a3c"/><rect x="18" y="128" width="40" height="10" rx="2" fill="#2c2f38"/>`+close;
  if(ws===2)return winHTML('w2')+open+`<defs><linearGradient id="bm2" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e8b34b" stop-opacity=".32"/><stop offset="1" stop-color="#e8b34b" stop-opacity="0"/></linearGradient></defs>
    <g stroke="#7b8090" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".7">
    <path d="M120 78l22 -18M136 56l14 8-8 12"/><path d="M168 84l30-30M194 50a8 8 0 1 1-6 14"/><path d="M214 80h34M222 80v-14a6 6 0 0 1 12 0v14"/><path d="M262 54v34M254 54h16M256 88h12"/></g>
    <path d="M150 0V10M300 0V10" stroke="#0c0d10" stroke-width="2"/><path d="M138 10h24l8 14h-40zM288 10h24l8 14h-40z" fill="#2c2f38" stroke="#0c0d10"/><path d="M142 24l-12 70h52l-12-70zM292 24l-12 70h52l-12-70z" fill="url(#bm2)"/>`+close;
  if(ws===3){
    let truss='';for(let x=0;x<=360;x+=36)truss+=`M${x} 6L${x+18} 30L${x+36} 6`;
    return open+`<defs><linearGradient id="sk3" x1="0" x2="0" y1="0" y2="1">${sky}</linearGradient></defs>
      <g>${[0,1,2,3,4,5].map(i=>`<rect x="${14+i*58}" y="38" width="44" height="26" fill="url(#sk3)" stroke="#0c0d10" stroke-width="3"/><path d="M${36+i*58} 38v26M${14+i*58} 51h44" stroke="#0c0d10" stroke-width="2"/>`).join('')}</g>
      <path d="${truss}" stroke="#3a3d47" stroke-width="3" fill="none"/><path d="M0 6H360M0 30H360" stroke="#2c2f38" stroke-width="4"/>
      ${[0,1,2,3].map(i=>`<rect class="strip" x="${24+i*86}" y="31" width="54" height="5" rx="2" fill="#fff3cf"/>`).join('')}`+close;}
  if(ws===4)return open+`<defs><linearGradient id="pp4" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3a3d47"/><stop offset="1" stop-color="#23252c"/></linearGradient></defs>
    <rect x="0" y="12" width="360" height="5" fill="#2c2f38"/><g class="crane"><rect x="-24" y="8" width="48" height="12" rx="2" fill="#4a4e5a"/><path d="M0 20V48" stroke="#8a8f9d" stroke-width="2"/><path d="M-6 48h12l-3 8h-6z" fill="#e8b34b"/></g>
    <rect x="0" y="62" width="360" height="12" fill="url(#pp4)"/><rect x="0" y="84" width="360" height="8" fill="url(#pp4)"/>
    ${[40,120,200,280].map(x=>`<circle cx="${x}" cy="68" r="9" fill="#23252c" stroke="#e8b34b" stroke-width="2"/><path d="M${x-6} 68h12M${x} 62v12" stroke="#e8b34b" stroke-width="1.6"/>`).join('')}
    <rect x="300" y="26" width="40" height="70" fill="#1b1d23" stroke="#3a3d47" stroke-width="2"/>${[0,1,2,3,4,5].map(i=>`<path d="M304 ${34+i*10}h32" stroke="#0c0d10" stroke-width="3"/>`).join('')}
    <circle class="led l1" cx="20" cy="110" r="3" fill="#6dc79a"/><circle class="led l2" cx="32" cy="110" r="3" fill="#e8b34b"/><circle class="led l3" cx="44" cy="110" r="3" fill="#6dc79a"/>`+close;
  return open+`<defs><linearGradient id="sk5" x1="0" x2="0" y1="0" y2="1">${sky}</linearGradient></defs>
    <rect width="360" height="150" fill="url(#sk5)"/><g>${skylineSVG()}</g>
    <g stroke="#0b0c10" stroke-width="3" opacity=".85">${[1,2,3,4,5].map(i=>`<path d="M${i*60} 0V150"/>`).join('')}<path d="M0 50H360M0 100H360"/></g>
    <rect class="strip" x="20" y="4" width="320" height="3" rx="1.5" fill="#fff3cf" opacity=".85"/><rect x="0" y="0" width="360" height="150" fill="#0b0c10" opacity=".25"/>`+close;
}
/* wall and floor per space level */
document.head.appendChild(Object.assign(document.createElement('style'),{textContent:`
.shop .wall .wallart{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.shop .wall .win{z-index:1}
.shop.ws0 .wall{background:repeating-linear-gradient(90deg,#1e2026 0 7px,#181a1f 7px 9px),#181a1f!important}
.shop.ws0 .floor{background:linear-gradient(180deg,#14151a,#0f1014)!important}
.shop.ws1 .wall{background:repeating-linear-gradient(0deg,rgba(0,0,0,.28) 0 2px,transparent 2px 12px),repeating-linear-gradient(90deg,rgba(0,0,0,.2) 0 2px,transparent 2px 30px),#2b2322!important}
.shop.ws1 .floor{background:repeating-linear-gradient(90deg,rgba(0,0,0,.28) 0 2px,transparent 2px 46px),linear-gradient(180deg,#221c18,#171310)!important}
.shop.ws2 .wall{background:radial-gradient(rgba(255,255,255,.07) 1.4px,transparent 1.8px) 0 0/14px 14px,#1b1d23!important}
.shop.ws2 .floor{background:linear-gradient(180deg,#15161b,#0f1014)!important}
.shop.ws2 .floor::before{display:block!important;content:"";height:4px;margin:-8px -8px 8px;background:repeating-linear-gradient(135deg,#e8b34b 0 10px,#15161b 10px 20px)!important;opacity:.85}
.shop.ws3 .wall{background:linear-gradient(180deg,#1d2027,#15171c)!important}
.shop.ws3 .wall::before{content:"";position:absolute;left:0;right:0;bottom:0;height:10px;background:repeating-linear-gradient(135deg,#e8b34b 0 10px,#15161b 10px 20px);opacity:.8;z-index:1}
.shop.ws3 .floor{background:linear-gradient(180deg,#121317,#0c0d10)!important}
.shop.ws4 .wall{background:linear-gradient(180deg,#171a20,#101216)!important}
.shop.ws4 .floor{background:repeating-linear-gradient(45deg,rgba(255,255,255,.035) 0 6px,transparent 6px 12px),linear-gradient(180deg,#14161b,#0d0e12)!important}
.shop.ws5 .wall{background:#0b0c10!important}
.shop.ws5 .floor{background:linear-gradient(180deg,#171a22,#0b0c10 60%,#13161d)!important}
.shop.ws5 .floor::before{display:block!important;content:"";height:2px;margin:-8px -8px 8px;background:linear-gradient(90deg,transparent,rgba(232,179,75,.8),transparent)!important}
.bulb{transform-origin:120px 0;animation:swing 4s ease-in-out infinite}@keyframes swing{50%{transform:rotate(2.5deg)}}
.crane{animation:crane 16s ease-in-out infinite alternate}@keyframes crane{from{transform:translateX(40px)}to{transform:translateX(300px)}}
.led{animation:blink 1.6s steps(2) infinite}.led.l2{animation-delay:.5s}.led.l3{animation-delay:1s}
.strip{animation:strip 5s ease-in-out infinite}@keyframes strip{50%{opacity:.7}}
.tw{animation:blink 3s ease-in-out infinite}
.win.w1{left:14px;width:64px;height:56px;border-width:5px}.win.w2{left:14px;width:56px;height:44px}
.shop .wall .spname{top:8px!important;bottom:auto!important;left:50%!important;transform:translateX(-50%);z-index:3;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.08);padding:2px 10px;border-radius:99px;color:#c9ced9!important;white-space:nowrap}
.shop .wall .clockface,.shop .wall .board{z-index:3}
@media (prefers-reduced-motion:reduce){.bulb,.crane,.led,.strip,.tw{animation:none}}
`}));
