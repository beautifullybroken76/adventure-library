(async()=>{
'use strict';
const $=id=>document.getElementById(id),API='https://loki-api.pamsprogramming.com',TOKEN_KEY='adventure_library_token_v1';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let config,bank;
try{const responses=await Promise.all(['adventure.json','questions.json'].map(x=>fetch('./'+x,{cache:'no-cache'})));
 if(responses.some(x=>!x.ok))throw Error('Could not load the adventure files');
 [config,bank]=await Promise.all(responses.map(x=>x.json()));
 if(!Array.isArray(bank.questions)||!Array.isArray(config.chapters))throw Error('Invalid adventure data');
}catch(e){$('game').innerHTML='<h2>The castle gates are stuck</h2><p>'+esc(e.message)+'. Serve the folder from a website, not file://.</p>';return}
const questions=bank.questions,total=questions.length;
function jwt(){const t=localStorage.getItem(TOKEN_KEY)||'';try{const p=JSON.parse(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(t.split('.')[1].length/4)*4,'=')));return p.exp*1000>Date.now()+30000?t:''}catch{return ''}}
function subject(t){try{const x=t.split('.')[1];const p=JSON.parse(atob(x.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(x.length/4)*4,'=')));return p.sub||p['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']||''}catch{return ''}}
const player=()=>subject(jwt())||'guest';let currentPlayer=player();const saveKey=()=>`serpent-progress-v1:${currentPlayer}`;
function load(){try{const s=JSON.parse(localStorage.getItem(saveKey()));if(s&&Array.isArray(s.completed))return s}catch{}return {completed:[],score:0}}
let state=load(),selected=null,hint=false,started=0;
function save(){try{localStorage.setItem(saveKey(),JSON.stringify(state))}catch(e){console.warn('Save unavailable',e)}}
function queueKey(){return `serpent-learning-queue-v1:${currentPlayer}`}
function getQueue(){try{const x=JSON.parse(localStorage.getItem(queueKey())||'[]');return Array.isArray(x)?x:[]}catch{return []}}
function setQueue(q){try{localStorage.setItem(queueKey(),JSON.stringify(q));return true}catch{return false}}
let flushing=false;
async function flush(){const t=jwt(),owner=subject(t);if(flushing||!owner||owner!==currentPlayer)return;flushing=true;
 try{for(let i=0;i<300;i++){if(jwt()!==t||currentPlayer!==owner)break;const q=getQueue();if(!q.length)break;
 const attempt=q[0];let r;try{r=await fetch(API+'/api/learning/attempts',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+t},body:JSON.stringify(attempt),cache:'no-store'})}catch{break}
 if(!r.ok){console.warn('Learning attempt retry pending',r.status);break}
 const latest=getQueue(),idx=latest.findIndex(x=>x.attemptId===attempt.attemptId);if(idx>=0){latest.splice(idx,1);setQueue(latest)}}}finally{flushing=false}}
const levels={apprentice:1,investigator:2,challenge:3};
function record(q,correct,usedHint){const t=jwt(),owner=subject(t);if(!owner||owner!==currentPlayer||!crypto.randomUUID)return;
 const skill=String(q.skill).toLowerCase();if(!['english','reading','math','science'].includes(skill)||!levels[q.difficulty]||!/^[a-zA-Z0-9._-]{1,120}$/.test(q.id))return;
 const queue=getQueue();if(queue.length>=300)return;
 queue.push({attemptId:crypto.randomUUID(),adventureId:'serpent',questionId:q.id,skillId:skill,difficulty:levels[q.difficulty],isCorrect:correct,usedHint,durationSeconds:Math.min(3600,Math.max(0,Math.round((Date.now()-started)/1000)))});
 if(setQueue(queue))void flush();}
function updateSync(){$('sync').textContent=jwt()?'Signed in • ACT practice attempts are sent to your learning dashboard. Story progress stays in this browser.':'Playing as a guest • story progress stays in this browser. Sign in at the Adventure Library to record ACT practice.'}
function render(){updateSync();const done=state.completed.length,q=questions.find(x=>!state.completed.includes(x.id));$('status').textContent=done+' / '+total+' puzzles solved';
 if(!q){$('game').innerHTML='<h2>✦ The Secret Is Yours</h2><p>The silver serpent uncurls from the stone. “I was never the lock,” it whispers. “I was the question.”</p><p>You open the final door—not to let danger in, but to let the truth out. Across the castle, windows bloom with morning light.</p><p><strong>Correct on first answer: '+state.score+' / '+total+'</strong></p><div class="controls"><button class="action" id="restart">Play again</button></div>';
 $('restart').onclick=()=>{if(confirm('Replay from the beginning? This resets story progress on this device but does not erase learning history.')){state={completed:[],score:0};save();render()}};return}
 const ch=config.chapters.find(x=>x.id===q.chapter),first=questions.find(x=>x.chapter===q.chapter)?.id===q.id;
 $('game').innerHTML='<div class="top"><span class="chip">Chapter '+q.chapter+': '+esc(ch.name)+'</span><span class="chip">'+esc(q.skill)+' · '+esc(q.difficulty)+'</span></div><div class="progress"><div style="width:'+(done/total*100)+'%"></div></div>'+(first?'<p class="lede">'+esc(ch.intro)+'</p>':'')+'<p class="muted">Clue '+(done+1)+' of '+total+'</p>'+(q.passage?'<blockquote class="feedback">'+esc(q.passage)+'</blockquote>':'')+'<h2>'+esc(q.question)+'</h2><div class="answers">'+q.answers.map((a,i)=>'<button class="answer" data-choice="'+i+'">'+String.fromCharCode(65+i)+'. '+esc(a)+'</button>').join('')+'</div><div id="feedback" aria-live="polite"></div><div class="controls"><button class="action secondary" id="hint">Ask the serpent for a hint</button><button class="action" id="continue" disabled>Continue →</button></div>';
 selected=null;hint=false;started=Date.now();
 document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{if(selected!==null)return;selected=Number(b.dataset.choice);const correct=selected===q.correct;if(correct)state.score++;
 state.completed.push(q.id);save();record(q,correct,hint);
 document.querySelectorAll('[data-choice]').forEach(x=>{x.disabled=true;if(Number(x.dataset.choice)===q.correct)x.classList.add('correct');else if(Number(x.dataset.choice)===selected)x.classList.add('wrong')});
 $('feedback').innerHTML='<div class="feedback"><strong>'+(correct?'✦ The serpent approves.':'Not quite. The serpent shows you why.')+'</strong><p>'+esc(q.explain)+'</p></div>';
 $('hint').disabled=true;$('continue').disabled=false});
 $('hint').onclick=()=>{if(hint||selected!==null)return;hint=true;$('feedback').innerHTML='<div class="feedback"><strong>The silver serpent whispers:</strong> '+esc(q.hint)+'</div>'};
 $('continue').onclick=()=>{const last=questions.filter(x=>x.chapter===q.chapter).at(-1)?.id===q.id;if(last&&state.completed.length<total){$('game').innerHTML='<h2>✦ '+esc(ch.name)+' complete</h2><p>'+esc(ch.outro)+'</p><button class="action" id="nextChapter">Open the next door →</button>';$('nextChapter').onclick=render}else render()};}
window.addEventListener('online',()=>void flush());document.addEventListener('visibilitychange',()=>{if(!document.hidden)void flush()});setInterval(()=>void flush(),20000);
window.addEventListener('storage',e=>{if(e.key===TOKEN_KEY){currentPlayer=player();state=load();render();void flush()}});
render();void flush();
})();
