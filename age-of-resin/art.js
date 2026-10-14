/* Age of Resin: all drawing. Everything is vector shapes drawn in code. */
const SKIN=['#d9a066','#e2b48c','#e8c39e','#d9a77d','#b9c7d6'];
const TEAM=['#3a7bd5','#c4453c'];
const R=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h)};
const E=(c,x,y,rx,ry,col)=>{c.fillStyle=col;c.beginPath();c.ellipse(x,y,rx,ry,0,0,7);c.fill()};
const L=(c,x1,y1,x2,y2,col,w)=>{c.strokeStyle=col;c.lineWidth=w||2;c.lineCap='round';c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()};
function weapon(c,age,type,sw,col){
  /* drawn in hand space at (6,-22); sw is swing 0..1 */
  const a=-.6+sw*1.6;c.save();c.translate(6,-22);c.rotate(a);
  if(type===0){
    if(age===0){L(c,0,0,12,0,'#7a5530',3);E(c,13,0,4,3.5,'#6a4a28')}
    else if(age===1){L(c,0,0,15,0,'#cfd6dc',2.4);L(c,0,-3,0,3,'#7a5530',2)}
    else if(age===2){L(c,0,0,18,0,'#dfe3e6',1.6);L(c,0,-3,0,3,'#c9a24a',2)}
    else if(age===3){L(c,0,0,13,0,'#33383c',2.4)}
    else {L(c,0,0,15,0,'#7ff3ff',3);L(c,0,0,15,0,'#fff',1)}
  }else{
    c.rotate(.6-a+(-.1));
    if(age===0){L(c,0,0,7,0,'#7a5530',2);E(c,9,0,2.4,2.4,'#999')}
    else if(age===1){c.strokeStyle='#7a5530';c.lineWidth=2;c.beginPath();c.arc(8,0,7,-1.2,1.2);c.stroke();L(c,8+Math.cos(1.2)*7,Math.sin(1.2)*7,8+Math.cos(1.2)*7,-Math.sin(1.2)*7,'#ddd',.8)}
    else if(age===2){L(c,-2,0,16,0,'#5a3b1e',3);L(c,10,-2,13,-4,'#444',2)}
    else if(age===3){L(c,-2,0,16,0,'#2c2f31',3);L(c,4,0,4,5,'#2c2f31',2)}
    else {L(c,-2,0,15,0,'#b69bff',4);E(c,16,0,2.5,2.5,'#7ff3ff')}
  }
  c.restore();
}
function head(c,age,y,col){
  E(c,0,y,5,5.2,SKIN[age]);
  if(age===0){c.fillStyle='#5a3b1e';c.beginPath();c.arc(0,y-1,5.4,3.3,6.1);c.fill()}
  else if(age===1){c.fillStyle='#aab3ba';c.beginPath();c.arc(0,y-1,5.6,3.14,6.28);c.fill();R(c,-1,y-8,2,5,col)}
  else if(age===2){c.fillStyle='#3a2f2a';c.beginPath();c.moveTo(-8,y-2);c.lineTo(0,y-9);c.lineTo(8,y-2);c.fill()}
  else if(age===3){c.fillStyle='#5c6b3a';c.beginPath();c.arc(0,y-1,5.8,3.14,6.28);c.fill()}
  else{c.fillStyle='#7ff3ff';c.beginPath();c.arc(0,y,5.6,3.6,6);c.fill()}
}
function human(c,u,def){
  const mv=u.moving?1:.15,wk=Math.sin(u.t*9)*mv,col=TEAM[u.side],a=u.age,h=def.type===0?0:0;
  L(c,-2,-13,-2+wk*5,0,'#3c3128',3);L(c,2,-13,2-wk*5,0,'#3c3128',3);
  R(c,-6,-27,12,15,col);
  if(a>=1)R(c,-6,-27,12,3,a===4?'#7ff3ff':'#ffffff55');
  if(a===1&&def.type===0)R(c,-6,-27,12,15,'#9aa4ab88');
  head(c,a,-33,col);
  weapon(c,a,def.type,u.sw>0?Math.sin((1-u.sw/.25)*3.14):0,col);
}
function dino(c,u){const wk=Math.sin(u.t*7)*(u.moving?1:.2),col=TEAM[u.side];
  L(c,-8,-14,-8+wk*7,0,'#4c7a3a',6);L(c,8,-14,8-wk*7,0,'#4c7a3a',6);
  c.fillStyle='#5f9444';c.beginPath();c.ellipse(0,-22,22,13,0,0,7);c.fill();
  c.beginPath();c.moveTo(18,-28);c.lineTo(34,-40);c.lineTo(40,-34);c.lineTo(30,-24);c.fill();
  c.beginPath();c.moveTo(-18,-22);c.lineTo(-38,-14);c.lineTo(-16,-14);c.fill();
  E(c,35,-37,1.6,1.6,'#111');R(c,-4,-45,10,18,col);E(c,1,-50,5,5,SKIN[0]);L(c,6,-40,22,-52,'#7a5530',2.5);
  for(let i=0;i<4;i++){c.fillStyle='#3f7030';c.beginPath();c.moveTo(-12+i*8,-33);c.lineTo(-8+i*8,-40);c.lineTo(-4+i*8,-33);c.fill()}}
function mammoth(c,u){const wk=Math.sin(u.t*5)*(u.moving?1:.2),col=TEAM[u.side];
  for(const x of [-18,-8,8,18])L(c,x,-18,x+wk*(x<0?4:-4),0,'#4a3626',7);
  E(c,0,-32,30,19,'#6b4f38');E(c,30,-36,12,12,'#6b4f38');
  c.strokeStyle='#4a3626';c.lineWidth=5;c.beginPath();c.moveTo(38,-34);c.quadraticCurveTo(48,-14,40,-8);c.stroke();
  c.strokeStyle='#efe6cf';c.lineWidth=3.4;c.beginPath();c.moveTo(34,-28);c.quadraticCurveTo(50,-26,52,-38);c.stroke();
  E(c,34,-39,1.5,1.5,'#111');R(c,-8,-60,22,10,col);R(c,-6,-70,10,12,col);E(c,-1,-75,5,5,SKIN[0]);L(c,4,-65,24,-76,'#7a5530',2.5);}
function horse(c,u,a){const wk=Math.sin(u.t*10)*(u.moving?1:.2),col=TEAM[u.side],coat=a===1?'#d8d4c8':a===2?'#7a4b2a':'#555';
  for(const x of [-12,-6,8,14])L(c,x,-17,x+wk*(x<0?6:-6),0,coat,3.5);
  E(c,0,-24,19,9,coat);c.fillStyle=coat;c.beginPath();c.moveTo(14,-28);c.lineTo(26,-42);c.lineTo(32,-38);c.lineTo(22,-24);c.fill();L(c,-18,-26,-26,-18,coat,3);
  R(c,-4,-47,9,20,col);E(c,0,-52,5,5,SKIN[a]);
  if(a===1){c.fillStyle='#aab3ba';c.beginPath();c.arc(0,-53,5.6,3.14,6.28);c.fill();L(c,6,-40,32,-36,'#cfd6dc',2)}
  else {L(c,6,-40,28,-48,'#dfe3e6',1.8);c.fillStyle='#3a2f2a';c.beginPath();c.moveTo(-8,-54);c.lineTo(0,-61);c.lineTo(8,-54);c.fill()}}
function catapult(c,u,sw){const col=TEAM[u.side];
  E(c,-14,-6,7,7,'#5a3b1e');E(c,14,-6,7,7,'#5a3b1e');R(c,-22,-16,44,7,'#7a5530');
  c.save();c.translate(0,-16);c.rotate(-.4-sw*1.1);L(c,0,0,-6,-32,'#8a6238',4);E(c,-6,-34,6,5,'#555');c.restore();R(c,-4,-26,8,12,col);}
function cannonCart(c,u,sw){const col=TEAM[u.side];
  E(c,-14,-6,7,7,'#4a3220');E(c,14,-6,7,7,'#4a3220');R(c,-20,-15,40,7,'#6a4a28');
  c.save();c.translate(2,-22);c.rotate(-.25);R(c,-4,-5,32,10,'#333');R(c,26,-6,6,12,'#222');c.restore();R(c,-16,-30,8,15,col);E(c,-12,-34,4.5,4.5,SKIN[2]);
  if(sw>0){E(c,40,-31,8+sw*5,6,'#ffcf5a')}}
function tank(c,u,sw,big){const col=TEAM[u.side],s=big?1.25:1;c.save();c.scale(s,s);
  R(c,-24,-12,48,10,'#4c553b');for(let i=-20;i<=20;i+=10)E(c,i,-5,4.5,4.5,'#2b2f26');
  R(c,-17,-22,32,11,'#5c6b3a');R(c,-5,-28,18,8,col);R(c,10,-26,32,4.5,'#3b4328');
  if(sw>0)E(c,46,-24,7+sw*5,5,'#ffcf5a');c.restore();}
function rocketTruck(c,u,sw){const col=TEAM[u.side];
  R(c,-26,-14,52,9,'#4c553b');E(c,-18,-5,5.5,5.5,'#222');E(c,0,-5,5.5,5.5,'#222');E(c,18,-5,5.5,5.5,'#222');
  R(c,14,-24,13,10,col);R(c,-22,-22,32,8,'#5c6b3a');
  c.save();c.translate(-8,-24);c.rotate(-.55);for(let i=0;i<3;i++){R(c,-14,i*4-6,30,3.5,'#2a2d25');R(c,14,i*4-6,5,3.5,sw>0?'#ffb84a':'#c44')}c.restore();}
function mech(c,u,sw,big){const col=TEAM[u.side],wk=Math.sin(u.t*6)*(u.moving?1:.2),s=big?1.35:1;c.save();c.scale(s,s);
  L(c,-9,-24,-9+wk*6,-3,'#5a6a7c',6);L(c,9,-24,9-wk*6,-3,'#5a6a7c',6);R(c,-14,-8,12,6,'#3b4756');R(c,2,-8,12,6,'#3b4756');
  R(c,-14,-44,28,22,'#7d8fa3');R(c,-14,-44,28,5,col);R(c,-8,-56,16,12,'#9fb2c6');R(c,-4,-52,8,4,'#7ff3ff');
  R(c,14,-40,18,6,'#3b4756');if(big){R(c,-30,-44,14,8,'#3b4756');E(c,-32,-40,4,4,'#ff6a6a')}
  if(sw>0)E(c,36,-37,5+sw*5,4,'#7ff3ff');c.restore();}
function drawUnit(c,u,def){
  c.save();c.translate(u.x,GY);if(u.side===1)c.scale(-1,1);
  const a=u.age,t=def.type,sw=u.sw>0?Math.sin((1-u.sw/.25)*3.14):0;
  E(c,0,1,t>=2?22:11,3.4,'#0003');
  if(u.dying>0){c.rotate(u.dying*-1.2);c.globalAlpha=1-u.dying*.9}
  if(t<=1)human(c,u,def);
  else if(t===2){if(a===0)dino(c,u);else if(a===1||a===2)horse(c,u,a);else if(a===3)tank(c,u,sw,0);else mech(c,u,sw,0)}
  else{if(a===0)mammoth(c,u);else if(a===1)catapult(c,u,sw);else if(a===2)cannonCart(c,u,sw);else if(a===3)rocketTruck(c,u,sw);else mech(c,u,sw,1)}
  if(u.flash>0){c.globalAlpha=Math.min(.5,u.flash*3);R(c,-18,-(t>=3?70:t===2?48:36),36,t>=3?70:t===2?48:36,'#fff')}
  c.restore();
  if(!u.dying&&u.hp<u.maxhp){const w=t>=2?34:24,hh=t>=3?-(a===0?80:62):t===2?-56:-44,x=u.x-w/2;
    c.fillStyle='#000a';c.fillRect(x-1,GY+hh-1,w+2,5);c.fillStyle=u.side?'#e0605a':'#5ac26c';c.fillRect(x,GY+hh,w*u.hp/u.maxhp,3)}
}
function drawBase(c,side,age,hp,max,t){
  c.save();if(side===1){c.translate(WW,0);c.scale(-1,1)}
  const col=TEAM[side];
  if(age===0){c.fillStyle='#7d735f';c.beginPath();c.moveTo(0,GY);c.lineTo(10,GY-70);c.lineTo(40,GY-110);c.lineTo(80,GY-96);c.lineTo(112,GY-40);c.lineTo(125,GY);c.fill();
    c.fillStyle='#5f5646';c.beginPath();c.ellipse(70,GY-2,22,34,0,3.14,6.28);c.fill();E(c,70,GY-30,14,6,'#2b2318');
    R(c,40,GY-130,3,24,'#5a3b1e');R(c,43,GY-130,16,10,col);L(c,18,GY-40,30,GY-62,'#e8e0cc',3);L(c,95,GY-30,100,GY-60,'#e8e0cc',3)}
  else if(age===1){R(c,10,GY-90,100,90,'#9c9a93');for(let i=0;i<5;i++)R(c,10+i*20,GY-100,12,12,'#9c9a93');
    R(c,0,GY-140,40,140,'#8c8a83');for(let i=0;i<3;i++)R(c,i*14,GY-150,10,12,'#8c8a83');R(c,18,GY-190,3,44,'#5a3b1e');R(c,21,GY-190,22,14,col);
    c.fillStyle='#2d2a25';c.beginPath();c.moveTo(60,GY);c.lineTo(60,GY-38);c.arc(76,GY-38,16,3.14,6.28);c.lineTo(92,GY);c.fill();
    for(let i=0;i<4;i++)R(c,12+i*24,GY-70,4,12,'#4b4943')}
  else if(age===2){R(c,6,GY-80,112,80,'#a58d6c');R(c,0,GY-130,34,130,'#94805f');c.fillStyle='#8a3a2a';c.beginPath();c.moveTo(-6,GY-130);c.lineTo(17,GY-160);c.lineTo(40,GY-130);c.fill();
    R(c,17,GY-185,3,28,'#444');R(c,20,GY-185,18,11,col);for(let i=0;i<4;i++){R(c,46+i*18,GY-62,10,16,'#2f2a26');R(c,46+i*18,GY-36,10,16,'#2f2a26')}
    c.fillStyle='#3a3029';c.beginPath();c.moveTo(48,GY);c.lineTo(48,GY-24);c.arc(60,GY-24,12,3.14,6.28);c.lineTo(72,GY);c.fill()}
  else if(age===3){R(c,0,GY-70,120,70,'#8f918f');R(c,0,GY-78,120,10,'#6f716f');R(c,10,GY-130,34,60,'#7c7e7c');R(c,26,GY-168,2,40,'#333');E(c,27,GY-170,5,5,'#e44');
    R(c,56,GY-50,50,14,'#2f3234');R(c,14,GY-116,26,8,'#4c7080');R(c,60,GY-100,26,20,'#6f716f');R(c,86,GY-96,3,16,col);
    for(let i=0;i<3;i++)R(c,56+i*18,GY-30,12,30,'#55585a')}
  else{const g=.5+.5*Math.sin(t*2);R(c,0,GY-40,120,40,'#2a2b46');
    c.fillStyle='#4b3f96';c.beginPath();c.moveTo(18,GY-40);c.lineTo(34,GY-200);c.lineTo(52,GY-40);c.fill();
    c.fillStyle='#37306f';c.beginPath();c.moveTo(60,GY-40);c.lineTo(76,GY-150);c.lineTo(92,GY-40);c.fill();
    E(c,34,GY-205,7+g*2,7+g*2,'#7ff3ff');E(c,76,GY-155,5+g*2,5+g*2,col);R(c,10,GY-44,100,4,'#7ff3ff');
    c.strokeStyle='#7ff3ff55';c.lineWidth=6;c.beginPath();c.ellipse(60,GY-30,64,16,0,0,7);c.stroke()}
  c.restore();
}
function drawTurret(c,tu,x,y,side,age,flash){
  c.save();c.translate(x,y);if(side===1)c.scale(-1,1);
  const col=TEAM[side];R(c,-9,-2,18,6,'#00000044');
  if(age===0){R(c,-8,-4,16,6,'#7a5530');L(c,0,-4,12,-14,'#5a3b1e',3);E(c,14,-16,4,4,'#888')}
  else if(age===1){R(c,-9,-4,18,7,'#7a5530');L(c,-6,-6,16,-12,'#4a3220',3);L(c,16,-12,16,-12,'#ddd',2);R(c,-3,-12,5,6,col)}
  else if(age===2){E(c,0,-4,8,5,'#444');R(c,-2,-18,10,16,'#2f2f2f');R(c,-4,-20,14,4,'#555')}
  else if(age===3){R(c,-8,-4,16,6,'#4c553b');R(c,-2,-10,26,4,'#222');R(c,-3,-14,8,6,'#555')}
  else{E(c,0,-5,9,6,'#3b4756');R(c,-3,-16,18,5,'#9fb2c6');E(c,16,-13.5,3,3,'#7ff3ff')}
  if(flash>0)E(c,18,-14,5,4,'#ffd35a');
  c.restore();
}
function drawProj(c,p){
  const u=p.u,x=p.x0+(p.tx-p.x0)*u,y=p.y0+(p.ty-p.y0)*u-p.arc*Math.sin(Math.PI*u),dir=p.tx>=p.x0?1:-1;
  c.save();c.translate(x,y);
  const ang=Math.atan2((p.ty-p.y0)-p.arc*Math.PI*Math.cos(Math.PI*u),(p.tx-p.x0));c.rotate(ang);
  if(p.kind==='rock'){E(c,0,0,3.4,3.4,'#8a8a8a')}
  else if(p.kind==='arrow'){L(c,-7,0,5,0,'#6a4a28',1.6);R(c,5,-1.5,3,3,'#ccc');L(c,-7,0,-9,-2,'#ddd',1);L(c,-7,0,-9,2,'#ddd',1)}
  else if(p.kind==='ball'){E(c,0,0,3.6,3.6,'#222');E(c,-1,-1,1.3,1.3,'#666')}
  else if(p.kind==='bullet'){R(c,-5,-1,8,2,'#ffe18a')}
  else if(p.kind==='shell'){E(c,0,0,4,3,'#555');R(c,-3,-1,4,2,'#ff9a3a')}
  else if(p.kind==='laser'){R(c,-9,-1.5,16,3,'#7ff3ff');R(c,-9,-.5,16,1,'#fff')}
  else if(p.kind==='plasma'){E(c,0,0,5,5,'#b69bff');E(c,0,0,2.6,2.6,'#fff')}
  c.restore();
}
function drawBackground(c,age,camx,t){
  const A=AGES[age],g=c.createLinearGradient(0,0,0,GY);g.addColorStop(0,A.sky[0]);g.addColorStop(1,A.sky[1]);c.fillStyle=g;c.fillRect(0,0,VW,VH);
  if(age===4){c.fillStyle='#fff';for(let i=0;i<40;i++){const sx=(i*97+camx*.05)%VW,sy=(i*53)%200;c.globalAlpha=.35+.35*Math.sin(t*2+i);c.fillRect(sx,sy,1.6,1.6)}c.globalAlpha=1}
  E(c,VW*.78-camx*.03,70,24,24,A.sun);
  c.fillStyle='#ffffff55';for(let i=0;i<5;i++){const cx=((i*230+t*6-camx*.1)%(VW+200))-60;E(c,cx,50+i*17%60,34,9,'#ffffff44');E(c,cx+18,44+i*17%60,22,8,'#ffffff44')}
  for(const [col,k,h,f] of [[A.far,.2,120,.011],[A.near,.4,80,.017]]){
    c.fillStyle=col;c.beginPath();c.moveTo(0,GY);
    for(let x=0;x<=VW;x+=8){const wx=x+camx*k;c.lineTo(x,GY-h*(.55+.25*Math.sin(wx*f)+.2*Math.sin(wx*f*2.3+1.3)))}
    c.lineTo(VW,GY);c.fill()}
  c.fillStyle=A.gnd;c.fillRect(0,GY,VW,VH-GY);c.fillStyle=A.gnd2;c.fillRect(0,GY+18,VW,VH);c.fillStyle=A.grass;c.fillRect(0,GY-2,VW,5);
  c.fillStyle='#00000018';for(let i=0;i<14;i++){const px=((i*83-camx)%VW+VW)%VW;c.fillRect(px,GY+8+(i*7)%40,26,2)}
}
