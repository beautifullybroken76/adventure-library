(async()=>{
'use strict';
const $=id=>document.getElementById(id),API='https://loki-api.pamsprogramming.com',TOKEN_KEY='adventure_library_token_v1';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let config,bank;
try{const r=await Promise.all(['adventure.json','questions.json'].map(x=>fetch('./'+x,{cache:'no-cache'})));
 if(r.some(x=>!x.ok))throw Error('Could not load the adventure files');[config,bank]=await Promise.all(r.map(x=>x.json()));
 if(!Array.isArray(bank.questions)||!Array.isArray(config.chapters))throw Error('Invalid adventure data');
}catch(e){$('game').innerHTML='<h2>The castle gates are stuck</h2><p>'+esc(e.message)+'</p>';return}
const questions=bank.questions,levels={apprentice:1,investigator:2,challenge:3};
const levelNames={apprentice:'Apprentice · Foundations',investigator:'Investigator · Intermediate',challenge:'Master of Secrets · Challenge'};
function jwt(){const t=localStorage.getItem(TOKEN_KEY)||'';try{const x=t.split('.')[1],p=JSON.parse(atob(x.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(x.length/4)*4,'=')));return p.exp*1000>Date.now()+30000?t:''}catch{return ''}}
function subject(t){try{const x=t.split('.')[1],p=JSON.parse(atob(x.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(x.length/4)*4,'=')));return p.sub||p['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']||''}catch{return ''}}
const player=()=>subject(jwt())||'guest';let currentPlayer=player();const saveKey=()=>`serpent-progress-v1:${currentPlayer}`;
function load(){try{const s=JSON.parse(localStorage.getItem(saveKey()));if(s&&Array.isArray(s.completed))return {completed:s.completed,score:Number(s.score)||0,level:levels[s.level]?s.level:'investigator',runs:s.runs||{}}}catch{}return {completed:[],score:0,level:'investigator',runs:{}}}
let state=load(),mode='home',activeChapter=0,activeQuestions=[],position=0,selected=null,hint=false,started=0;
function save(){try{localStorage.setItem(saveKey(),JSON.stringify(state))}catch(e){console.warn('Save unavailable',e)}}
const ROUND_SIZE=5;
function runKey(ch){return state.level+':'+ch}
function run(ch){return state.runs[runKey(ch)]||{completed:[],score:0}}
function pool(ch){return questions.filter(q=>q.chapter===ch&&q.difficulty===state.level)}
function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function selectRound(ch,previous=[]){
 const all=pool(ch),seen=new Set(previous),fresh=shuffle(all.filter(q=>!seen.has(q.id)));
 const selected=fresh.slice(0,ROUND_SIZE);
 if(selected.length<Math.min(ROUND_SIZE,all.length))selected.push(...shuffle(all.filter(q=>!selected.includes(q))).slice(0,Math.min(ROUND_SIZE,all.length)-selected.length));
 return selected.map(q=>q.id);
}
function ensureRun(ch){
 const key=runKey(ch),r=state.runs[key]||{completed:[],score:0};
 if(!Array.isArray(r.questionIds)||!r.questionIds.length){
   // Preserve legacy progress when possible, but make the current round stable.
   const old=Array.isArray(r.completed)?r.completed.filter(id=>pool(ch).some(q=>q.id===id)):[];
   r.questionIds=[...old.slice(0,ROUND_SIZE),...selectRound(ch,old).slice(0,Math.max(0,ROUND_SIZE-old.length))];
   r.completed=old.filter(id=>r.questionIds.includes(id));
   r.score=Math.min(Number(r.score)||0,r.completed.length);
   state.runs[key]=r;save();
 }
 return r;
}
function chapterQuestions(ch){const r=ensureRun(ch),byId=new Map(pool(ch).map(q=>[q.id,q]));return r.questionIds.map(id=>byId.get(id)).filter(Boolean)}
function replayRound(ch){const key=runKey(ch),old=run(ch);state.runs[key]={completed:[],score:0,questionIds:selectRound(ch,old.questionIds||[])};save()}

function queueKey(){return `serpent-learning-queue-v1:${currentPlayer}`}
function getQueue(){try{const q=JSON.parse(localStorage.getItem(queueKey())||'[]');return Array.isArray(q)?q:[]}catch{return []}}
function setQueue(q){try{localStorage.setItem(queueKey(),JSON.stringify(q));return true}catch{return false}}
let flushing=false;
async function flush(){const t=jwt(),owner=subject(t);if(flushing||!owner||owner!==currentPlayer)return;flushing=true;
 try{for(let i=0;i<300;i++){if(jwt()!==t||currentPlayer!==owner)break;const q=getQueue();if(!q.length)break;
 const attempt=q[0];let r;try{r=await fetch(API+'/api/learning/attempts',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+t},body:JSON.stringify(attempt),cache:'no-store'})}catch{break}
 if(!r.ok){console.warn('Learning attempt retry pending',r.status);break}
 const latest=getQueue(),idx=latest.findIndex(x=>x.attemptId===attempt.attemptId);if(idx>=0){latest.splice(idx,1);setQueue(latest)}}}finally{flushing=false}}
function record(q,correct,usedHint){const t=jwt(),owner=subject(t);if(!owner||owner!==currentPlayer||!crypto.randomUUID)return;
 const skill=String(q.skill).toLowerCase();if(!['english','reading','math','science'].includes(skill)||!levels[q.difficulty]||!/^[a-zA-Z0-9._-]{1,120}$/.test(q.id))return;
 const queue=getQueue();if(queue.length>=300)return;
 queue.push({attemptId:crypto.randomUUID(),adventureId:'serpent',questionId:q.id,skillId:skill,difficulty:levels[q.difficulty],isCorrect:correct,usedHint,durationSeconds:Math.min(3600,Math.max(0,Math.round((Date.now()-started)/1000)))});
 if(setQueue(queue))void flush()}
function updateSync(){$('sync').textContent=jwt()?'Signed in · New answers sync to your learning dashboard. Story progress stays in this browser.':'Guest mode · story progress stays in this browser. Sign in at the Adventure Library to record ACT practice.'}
function header(){
 updateSync();
 const completedChapters=config.chapters.filter(ch=>{
  const qs=chapterQuestions(ch.id),r=run(ch.id);
  return qs.length>0&&qs.every(q=>r.completed.includes(q.id))
 }).length;
 const all=Object.values(state.runs).reduce((n,r)=>n+(r.completed?.length||0),0);
 $('status').textContent=all+' clues solved across current paths';
 const current=mode==='question'||mode==='complete'?activeChapter:
   (config.chapters.find(ch=>{const qs=chapterQuestions(ch.id),r=run(ch.id);return qs.length&&qs.some(q=>!r.completed.includes(q.id))})?.id||config.chapters.at(-1)?.id||1);
 const chapter=config.chapters.find(ch=>ch.id===current);
 const levelLabel=state.level==='challenge'?'Master of Secrets':state.level==='investigator'?'Investigator':'Apprentice';
 const chips=[
  'Chapter '+current+' · '+(chapter?.name||''),
  'Chambers '+completedChapters+' / '+config.chapters.length,
  'Clues practiced '+all,
  'Difficulty · '+levelLabel
 ];
 $('overview').replaceChildren(...chips.map(label=>{const span=document.createElement('span');span.className='chip';span.textContent=label;return span}));
}
function home(){mode='home';header();const chapterCards=config.chapters.map((ch,i)=>{
 const qs=chapterQuestions(ch.id),r=run(ch.id),complete=qs.length>0&&qs.every(q=>r.completed.includes(q.id));
 const unlocked=i===0||config.chapters.slice(0,i).every(c=>{const a=chapterQuestions(c.id),b=run(c.id);return a.length>0&&a.every(q=>b.completed.includes(q.id))});
 const status=complete?'✦ Chamber unsealed':unlocked?'Ready to explore':'🔒 Complete the previous chamber';
 const button=complete?'Replay with fresh clues':unlocked?'Enter chamber':'Locked';
 return '<article class="chapter-card'+(unlocked?'':' locked')+'"><div class="eyebrow">CHAPTER '+ch.id+'</div><h3>'+esc(ch.name)+'</h3><p>'+esc(ch.intro)+'</p><p class="chapter-status">'+status+' · '+r.completed.length+' / '+qs.length+' clues</p><button class="action" data-chapter="'+ch.id+'" '+(unlocked?'':'disabled')+'>'+button+'</button></article>'}).join('');
 const allQuestions=config.chapters.flatMap(c=>chapterQuestions(c.id)),done=allQuestions.filter(q=>run(q.chapter).completed.includes(q.id)).length;
 $('game').innerHTML='<div class="eyebrow">INVESTIGATOR\'S DOSSIER</div><h2>Choose your path</h2><p class="muted">The silver serpent coils around a map of five sealed chambers. Which mystery will you unlock?</p><div class="difficulty"><label for="difficulty">Choose your difficulty</label><select id="difficulty">'+Object.keys(levels).map(l=>'<option value="'+l+'"'+(state.level===l?' selected':'')+'>'+esc(levelNames[l])+'</option>').join('')+'</select><p class="notice">Each level has its own progress. Each chamber draws five clues; replays favor questions you have not just seen.</p></div><p class="muted">'+done+' / '+allQuestions.length+' clues solved on this difficulty</p><div class="progress"><div style="width:'+(allQuestions.length?done/allQuestions.length*100:0)+'%"></div></div><div class="chapter-grid">'+chapterCards+'</div>';
 $('difficulty').onchange=e=>{state.level=e.target.value;save();home()};
 document.querySelectorAll('[data-chapter]').forEach(b=>b.onclick=()=>enterChapter(Number(b.dataset.chapter)));
}
function enterChapter(ch){let qs=chapterQuestions(ch);if(!qs.length)return;const r=run(ch);if(qs.every(q=>r.completed.includes(q.id))){if(!confirm('Replay this chamber with a fresh mix of clues? Your earlier learning records will remain on the dashboard.'))return;replayRound(ch);qs=chapterQuestions(ch)}
 activeChapter=ch;activeQuestions=qs;position=0;while(position<qs.length&&run(ch).completed.includes(qs[position].id))position++;question()}
function question(){mode='question';header();if(position>=activeQuestions.length){chapterComplete();return}
 const q=activeQuestions[position],ch=config.chapters.find(x=>x.id===activeChapter),r=run(activeChapter),first=position===0;
 $('game').innerHTML='<div class="top"><span class="chip">Chapter '+activeChapter+': '+esc(ch.name)+'</span><span class="chip">'+esc(q.skill)+' · '+esc(levelNames[state.level])+'</span></div><div class="progress"><div style="width:'+(position/activeQuestions.length*100)+'%"></div></div>'+(first?'<p class="lede">'+esc(ch.intro)+'</p>':'')+'<p class="muted">Clue '+(position+1)+' of '+activeQuestions.length+'</p>'+(q.passage?'<blockquote class="feedback">'+esc(q.passage)+'</blockquote>':'')+'<h2>'+esc(q.question)+'</h2><div class="answers">'+q.answers.map((a,i)=>'<button class="answer" data-choice="'+i+'">'+String.fromCharCode(65+i)+'. '+esc(a)+'</button>').join('')+'</div><div id="feedback" aria-live="polite"></div><div class="controls"><button class="action secondary" id="hint">Ask the serpent for a hint</button><button class="action" id="continue" disabled>Continue →</button><button class="action secondary" id="back">Save & exit</button></div>';
 selected=null;hint=false;started=Date.now();
 document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{if(selected!==null)return;selected=Number(b.dataset.choice);const correct=selected===q.correct;if(correct)r.score++;
 r.completed.push(q.id);state.runs[state.level+':'+activeChapter]=r;save();record(q,correct,hint);
 document.querySelectorAll('[data-choice]').forEach(x=>{x.disabled=true;if(Number(x.dataset.choice)===q.correct)x.classList.add('correct');else if(Number(x.dataset.choice)===selected)x.classList.add('wrong')});
 $('feedback').innerHTML='<div class="feedback"><strong>'+(correct?'✦ The serpent approves.':'Not quite. The serpent shows you why.')+'</strong><p>'+esc(q.explain)+'</p></div>';
 $('hint').disabled=true;$('continue').disabled=false});
 $('hint').onclick=()=>{if(hint||selected!==null)return;hint=true;$('feedback').innerHTML='<div class="feedback"><strong>The silver serpent whispers:</strong> '+esc(q.hint)+'</div>'};
 $('continue').onclick=()=>{position++;question()};$('back').onclick=home;
}
function chapterComplete(){mode='complete';header();const ch=config.chapters.find(x=>x.id===activeChapter),r=run(activeChapter),last=activeChapter===config.chapters.at(-1).id;
 $('game').innerHTML='<div class="eyebrow">CHAMBER UNSEALED</div><h2>✦ '+esc(ch.name)+'</h2><p>'+esc(ch.outro)+'</p><p>Correct on first answer: <strong>'+r.score+' / '+activeQuestions.length+'</strong></p>'+(last?'<p>The serpent raises its silver head. The castle has one fewer secret tonight.</p>':'')+'<button class="action" id="return">Return to the dossier →</button>';
 $('return').onclick=home;
}
window.addEventListener('online',()=>void flush());document.addEventListener('visibilitychange',()=>{if(!document.hidden)void flush()});setInterval(()=>void flush(),20000);
window.addEventListener('storage',e=>{if(e.key===TOKEN_KEY){currentPlayer=player();state=load();home();void flush()}});
home();void flush();
})();
