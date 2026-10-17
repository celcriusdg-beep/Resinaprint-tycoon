/* Save guard (4.53). Before this, a save that failed to load was silently replaced by a new game.
   - If loading fails, the old save is never overwritten: it is kept, the game tries a safe fallback load,
     and a recovery screen lets you restore a backup, copy the save text or start over on purpose.
   - Up to 3 automatic backups: one every 20 minutes of play, plus one right before every update.
   - Empire › Company › Save backups: restore any backup, or load a save you pasted as text. */
const SV_KEY='resinaprint-tycoon-v2',BK_KEY='resinaprint-backups',BR_KEY='resinaprint-broken',BK_MAX=3,BK_EVERY=20*60*1000;
let saveLock=false,loadIssue=null;
const bkList=()=>{try{return JSON.parse(localStorage.getItem(BK_KEY)||'[]')}catch(e){return []}};
function bkWrite(L){for(let n=L.length;n>=0;n--){try{if(n)localStorage.setItem(BK_KEY,JSON.stringify(L.slice(0,n)));else localStorage.removeItem(BK_KEY);return n}catch(e){}}return 0}
function bkAdd(json,why){let s;try{s=JSON.parse(json)}catch(e){return}if(!s||s.v!==2||!s.started)return;
  const L=bkList().filter(b=>b.why!==why||!/update/.test(why));L.unshift({at:Date.now(),why,day:s.day,lv:s.lv,cash:s.cash,reb:(s.reb&&s.reb.count)||0,json});bkWrite(L.slice(0,BK_MAX))}
const _loadSG=load;
load=function(){
  let j=null;try{j=localStorage.getItem(SV_KEY)}catch(e){}if(!j)return null;
  let s=null;try{s=JSON.parse(j)}catch(e){}
  if(s&&s.v===2){
    if(s.started&&s.seenVer&&typeof VERSION!=='undefined'&&s.seenVer!==VERSION)bkAdd(j,'before update '+VERSION);
    try{return patch(s)}catch(e){try{console.error('patch failed',e)}catch(_){}loadIssue={kind:'partial',err:String(e&&e.message||e)}}
    try{const s2=JSON.parse(j);const r=patchBase(s2);try{localStorage.setItem(BR_KEY,j)}catch(_){}return r}catch(e){loadIssue={kind:'broken',err:String(e&&e.message||e)}}
  }else loadIssue={kind:'broken',err:'The save text could not be read'};
  try{localStorage.setItem(BR_KEY,j)}catch(e){}
  saveLock=true;return null;
};
const _saveSG=save;
save=function(){
  if(saveLock)return;
  S.savedAt=Date.now();let j;try{j=JSON.stringify(S)}catch(e){return}
  let ok=false;for(let i=0;i<=BK_MAX&&!ok;i++){try{localStorage.setItem(SV_KEY,j);ok=true}catch(e){const L=bkList();if(!L.length)break;bkWrite(L.slice(0,L.length-1))}}
  if(typeof queueCloud==='function')queueCloud();
  const L=bkList();if(ok&&S.started&&(!L.length||Date.now()-L[0].at>BK_EVERY))bkAdd(j,'auto');
};
function restoreJson(json,label){
  let s;try{s=JSON.parse(json)}catch(e){return toast('That save text could not be read')}
  if(!s||s.v!==2)return toast('That is not a Resinaprint save');
  let r;try{r=patch(s)}catch(e){try{r=patchBase(JSON.parse(json))}catch(e2){return toast('This save could not be loaded either')}}
  if(S&&S.started&&!saveLock)bkAdd(JSON.stringify(S),'before restore');
  S=r;saveLock=false;loadIssue=null;lastHTML='';if(typeof closeModal==='function'&&modalOpen())closeModal();save();render();toast(label||'Save restored');
}
function bkWhen(t){const m=Math.round((Date.now()-t)/60000);return m<60?`${m} min ago`:m<1440?`${Math.round(m/60)} h ago`:`${Math.round(m/1440)} d ago`}
Object.assign(A,{
  bkRestore(d){const b=bkList()[+d.i];if(!b)return;confirmBox('Restore this backup?',`Day ${b.day}, level ${b.lv}, ${fmt(b.cash||0)}, saved ${bkWhen(b.at)}. Your current game is backed up first.`,()=>restoreJson(b.json,'Backup restored'))},
  bkCopy(d){const b=bkList()[+d.i];if(!b)return;const j=b.json;if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(j).then(()=>toast('Backup copied'),()=>saveBox(j));else saveBox(j)},
  bkPaste(){const t=prompt('Paste a save you copied earlier:');if(t&&t.trim())restoreJson(t.trim(),'Save loaded')},
  bkBroken(){let j=null;try{j=localStorage.getItem(BR_KEY)}catch(e){}if(!j)return toast('No broken save kept');if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(j).then(()=>toast('Save copied. Paste it in the chat.'),()=>saveBox(j));else saveBox(j)},
  bkFresh(){confirmBox('Start a new game?','Your old save stays kept as a backup and can still be copied from Empire › Company.',()=>{let j=null;try{j=localStorage.getItem(SV_KEY)}catch(e){}if(j)bkAdd(j,'old save');saveLock=false;loadIssue=null;save();toast('New game started')})}
});
function backupCard(){
  const L=bkList();let br=null;try{br=localStorage.getItem(BR_KEY)}catch(e){}
  return `<div class="card bk-card" style="margin-top:12px"><div class="t">Save backups</div><div class="s">The game keeps up to ${BK_MAX} backups: one every 20 minutes of play and one before every update.</div>
    ${L.length?L.map((b,i)=>`<div class="item"><div class="grow"><div class="t">Day ${b.day} · Lv ${b.lv} · ${fmt(b.cash||0)}</div><div class="s">${bkWhen(b.at)} · ${b.why}${b.reb?` · ${b.reb} rebirths`:''}</div></div><button class="btn sm" data-a="bkCopy" data-i="${i}">Copy</button><button class="btn sm primary" data-a="bkRestore" data-i="${i}">Restore</button></div>`).join(''):'<div class="s" style="margin-top:8px">No backups yet. The first one is made after 20 minutes of play.</div>'}
    <div class="opts"><button class="btn sm" data-a="bkPaste">Load a save from text</button>${br?'<button class="btn sm ghost" data-a="bkBroken">Copy the save that failed to load</button>':''}</div></div>`;
}
const _cvSG=companyView;companyView=function(){return _cvSG.apply(this,arguments)+backupCard()};
/* recovery screen when the save could not be loaded */
function showRecovery(){
  if(!loadIssue)return;const L=bkList();
  if(loadIssue.kind==='partial'){toast('Your save loaded in safe mode. If something looks wrong, restore a backup in Empire › Company');return}
  pending=[...L.slice(0,2).map((b,i)=>({f:()=>restoreJson(b.json,'Backup restored')})),{f:()=>A.bkBroken()},{f:()=>A.bkFresh()}];
  modal(`<h3>Your save could not be loaded</h3><p>Nothing was deleted: your save is kept safe and the game will not overwrite it.${L.length?' Restore a recent backup, or copy the save text and send it so it can be repaired.':' Copy the save text and send it so it can be repaired.'}</p>
    <div class="acts" style="flex-direction:column">${L.slice(0,2).map((b,i)=>`<button class="btn primary" data-choice="${i}">Restore: day ${b.day}, Lv ${b.lv}, ${fmt(b.cash||0)} (${bkWhen(b.at)})</button>`).join('')}<button class="btn" data-choice="${Math.min(2,L.length)}">Copy the save text</button><button class="btn ghost" data-choice="${Math.min(2,L.length)+1}">Start a new game</button></div>`);
}
setTimeout(showRecovery,900);
