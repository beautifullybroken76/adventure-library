// Shared login v1: API JWT kept on the library origin; never put in a URL.
(() => {
  'use strict';
  const API = 'https://loki-api.pamsprogramming.com';
  const KEY = 'adventure_library_token_v1';
  const $ = id => document.getElementById(id);
  const dlg = $('auth-dialog');
  function token() { return localStorage.getItem(KEY) || ''; }
  function userName() {
    try { const p = token().split('.')[1]; if (!p) return '';
      const json = JSON.parse(atob(p.replace(/-/g,'+').replace(/_/g,'/') .padEnd(Math.ceil(p.length / 4)*4,'=')));
      return json.unique_name || json['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || '';
    } catch { return ''; }
  }
  function expired(t) { try { const p=t.split('.')[1]; const data=JSON.parse(atob(p.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(p.length/4)*4,'='))); return !data.exp || data.exp*1000 <= Date.now()+30000; } catch { return true; } }
  function refresh() {
    if (token() && expired(token())) localStorage.removeItem(KEY);
    const signed = !!token();
    $('auth-status').textContent = signed ? `Signed in${userName() ? ' · '+userName() : ''}` : 'Not signed in';
    $('auth-open').hidden = signed; $('auth-logout').hidden = !signed;
  }
  async function auth(action) {
    const userName=$('auth-user').value.trim(),password=$('auth-pass').value;
    $('auth-message').textContent='Connecting…';
    try {
      const r=await fetch(API+'/api/auth/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userName,password}),cache:'no-store'});
      const data=await r.json().catch(()=>({}));
      if (!r.ok || !data.token) throw new Error(data.error || (r.status===401 ? 'Incorrect username or password.' : 'Sign-in failed ('+r.status+').'));
      localStorage.setItem(KEY,data.token); $('auth-pass').value=''; dlg.close(); refresh();
    } catch(e) { $('auth-message').textContent=e.message; }
  }
  $('auth-open').addEventListener('click',()=>dlg.showModal());
  $('auth-close').addEventListener('click',()=>dlg.close());
  $('auth-form').addEventListener('submit',e=>{e.preventDefault();auth('login');});
  $('auth-create').addEventListener('click',()=>auth('register'));
  $('auth-logout').addEventListener('click',()=>{localStorage.removeItem(KEY);refresh();});
  window.addEventListener('storage',e=>{if(e.key===KEY)refresh();});
  refresh();
})();
