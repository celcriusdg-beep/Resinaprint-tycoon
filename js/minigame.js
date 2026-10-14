/* Painting bench: an optional daily mini-game. Three brush strokes, tap when the brush is in the green zone. */
function paintCard(){
  if(!S.started||!S.printers.length)return '';
  const ready=S.paintDay!==S.day,ok=ready&&S.energy>=10;
  return `<div class="card paintc"><div class="perkico"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13c0-2 1.5-3 3-3 0 1.5-1 3-3 3zM6 10l7-7 1.5 1.5L7.5 11.5z"/></svg></div><div class="grow"><div class="t">Painting bench</div><div class="s">${ready?'Paint a showpiece by hand: three brush strokes for hype, XP and maybe an item. 10 energy, once a day.':'Done for today. Come back tomorrow for another showpiece.'}</div></div><button class="btn sm primary" data-a="paintStart" ${ok?'':'disabled'}>Paint</button></div>`;
}
Object.assign(A,{paintStart(){if(S.paintDay===S.day||S.energy<10)return;S.energy-=10;openPaint()}});
function openPaint(){
  const speeds=[2.3,3.2,4.2],widths=[.36,.26,.17];let round=0,t0=performance.now(),score=0,done=false,centers=[],results=[],raf=0;
  const pick=()=>.22+Math.random()*.56;centers.push(pick());
  modal(`<h3>Painting bench</h3><p id="pgInfo">Stroke 1 of 3. Tap <b>Brush</b> when the brush is inside the green zone.</p>
    <div class="pgbar"><i class="pgzone" id="pgZone"></i><i class="pgbrush" id="pgBrush"></i></div>
    <div class="pgstars" id="pgStars"><span>·</span><span>·</span><span>·</span></div>
    <div class="acts"><button class="btn primary" id="pgBtn">Brush!</button></div>`);
  const zone=document.getElementById('pgZone'),brush=document.getElementById('pgBrush'),info=document.getElementById('pgInfo'),stars=document.getElementById('pgStars'),btn=document.getElementById('pgBtn');
  const setZone=()=>{zone.style.left=(centers[round]-widths[round]/2)*100+'%';zone.style.width=widths[round]*100+'%'};setZone();
  const pos=()=>.5+.5*Math.sin(((performance.now()-t0)/1000)*speeds[Math.min(round,2)]);
  const tick=()=>{if(!document.body.contains(brush)){return}brush.style.left=pos()*100+'%';if(!done)raf=requestAnimationFrame(tick)};tick();
  btn.onclick=()=>{
    if(done){
      const st=Math.round(score);
      S.paintDay=S.day;S.hype+=6+8*st;addXp(8+S.lv*st*1.5);if(st>=1)earn('Showpiece',st*(50+S.lv*15));
      if(st>=3){review(5);addItem(pickItem(3));confetti(100);snd('level')}else if(st===2&&Math.random()<.4){addItem(pickItem(2));snd('good')}else if(st>=1)snd('good');else snd('bad');
      log(`Painted a showpiece: ${st} star${st===1?'':'s'}.`,st>=2?'good':'');closeModal();save();render();return}
    const p=pos(),d=Math.abs(p-centers[round]),w=widths[round],g=d<=w*.15?1:d<=w/2?.6:0;
    score+=g;results.push(g);stars.children[round].textContent=g===1?'★':g>0?'☆':'✕';stars.children[round].className=g===1?'perfect':g>0?'ok':'miss';snd(g?'good':'bad');buzz(g?10:25);
    round++;
    if(round>=3){done=true;const st=Math.round(score);info.innerHTML=`<b>${['A rough day','Not bad','Lovely work','A masterpiece!'][st]}</b> ${st} star${st===1?'':'s'}. ${st>=3?'A guaranteed item!':'Tap to collect.'}`;btn.textContent='Collect reward'}
    else{centers.push(pick());setZone();info.innerHTML=`Stroke ${round+1} of 3. Faster now.`}
  };
}
