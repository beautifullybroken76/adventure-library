(() => {
'use strict';
const API='https://loki-api.pamsprogramming.com';
const KEY='adventure_library_token_v1';
const $=id=>document.getElementById(id);
const notice=t=>$('notice').textContent=t;
function token(){return localStorage.getItem(KEY)||''}
function claims(){
  try{const p=token().split('.')[1];const d=JSON.parse(atob(p.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(p.length/4)*4,'=')));
    if(!d.exp||d.exp*1000<Date.now())return null;return d;}catch{return null}
}
function username(){const d=claims();return d?.unique_name||d?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']||'Player'}
async function request(path,method='GET',body){
 const r=await fetch(API+path,{method,headers:{Authorization:'Bearer '+token(),...(body?{'Content-Type':'application/json'}:{})},
   body:body?JSON.stringify(body):undefined,cache:'no-store'});
 const data=r.status===204?{}:await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(data.error||'Request failed ('+r.status+').');
 return data;
}
function cards(target,skills){
 target.replaceChildren();
 const names=['english','reading','math','science'];
 if(!skills.length){const p=document.createElement('p');p.textContent='No practice attempts recorded yet.';target.append(p);return}
 for(const skill of names){
  const s=skills.find(x=>x.skillId===skill);
  const el=document.createElement('div');el.className='card';
  const heading=document.createElement('h2');heading.textContent=skill[0].toUpperCase()+skill.slice(1);el.append(heading);
  if(!s){const p=document.createElement('p');p.textContent='Not practiced yet';el.append(p);target.append(el);continue}
  const rate=s.attempts?Math.round(s.independentCorrect/s.attempts*100):0;
  const big=document.createElement('div');big.className='metric';big.textContent=rate+'%';el.append(big);
  const bar=document.createElement('div');bar.className='bar';const fill=document.createElement('div');fill.style.width=rate+'%';bar.append(fill);el.append(bar);
  const detail=document.createElement('p');detail.className='muted';
  detail.textContent=`${s.attempts} attempts · ${s.independentCorrect} independently correct · ${s.assistedCorrect} with hints · ${s.incorrect} incorrect`;
  el.append(detail);target.append(el);
 }
}
async function loadOwn(){cards($('ownCards'),(await request('/api/learning/summary')).skills||[])}
async function loadChildren(){
 const {children=[]}=await request('/api/learning/children');
 const select=$('child'),prior=select.value;select.replaceChildren();
 const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=children.length?'Choose a player':'No linked players yet';select.append(placeholder);
 for(const c of children){const option=document.createElement('option');option.value=c.playerId;option.textContent=c.userName;select.append(option)}
 if(children.some(c=>c.playerId===prior))select.value=prior;
 else if(children.length)select.value=children[0].playerId;
 await loadChild();
}
async function loadChild(){
 if(!$('child').value){$('childCards').replaceChildren();return}
 cards($('childCards'),(await request('/api/learning/children/'+encodeURIComponent($('child').value)+'/summary')).skills||[]);
}
async function loadGrants(){
 const {parents=[]}=await request('/api/learning/parents');$('grants').replaceChildren();
 if(!parents.length){const li=document.createElement('li');li.textContent='No parent accounts have access.';$('grants').append(li);return}
 for(const parent of parents){
  const li=document.createElement('li');li.append(document.createTextNode(parent.userName+' '));
  const b=document.createElement('button');b.type='button';b.textContent='Revoke';
  b.onclick=async()=>{if(!confirm('Revoke access for '+parent.userName+'?'))return;
   try{await request('/api/learning/parents/'+encodeURIComponent(parent.playerId),'DELETE');await loadGrants();notice('Access revoked.')}catch(e){notice(e.message)}};
  li.append(b);$('grants').append(li);
 }
}
async function refresh(){
 const signed=!!claims();$('signin').classList.toggle('hidden',signed);$('signedin').classList.toggle('hidden',!signed);
 if(!signed){notice('Sign in to view learning data.');return}
 $('who').textContent='Signed in as '+username();
 try{await Promise.all([loadOwn(),loadChildren(),loadGrants()]);notice('Dashboard updated.')}
 catch(e){notice(e.message)}
}
$('signinForm').addEventListener('submit',async e=>{
 e.preventDefault();notice('Signing in…');
 try{const r=await fetch(API+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userName:$('user').value.trim(),password:$('pass').value})});
 const data=await r.json().catch(()=>({}));if(!r.ok||!data.token)throw new Error(data.error||'Sign-in failed.');
 localStorage.setItem(KEY,data.token);$('pass').value='';await refresh();
 }catch(err){notice(err.message)}
});
$('signout').onclick=()=>{localStorage.removeItem(KEY);refresh()};
$('grantForm').addEventListener('submit',async e=>{e.preventDefault();
 try{const r=await request('/api/learning/parents','POST',{parentUserName:$('parentUser').value.trim()});notice(r.message);$('parentUser').value='';await loadGrants()}catch(err){notice(err.message)}
});
$('child').onchange=()=>loadChild().catch(e=>notice(e.message));
$('refresh').onclick=()=>refresh();
window.addEventListener('storage',e=>{if(e.key===KEY)refresh()});
refresh();
})();
