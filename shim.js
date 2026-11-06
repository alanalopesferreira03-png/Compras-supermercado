/* Ponte entre o sistema e o Firebase: entrega ao app a mesma interface de banco de dados
   (doc, collection, get, set, update, delete, onSnapshot) e de download, com login por e-mail e senha. */
(function(){
  var cfg=window.FIREBASE_CONFIG||{};
  var V='10.12.2',B='https://www.gstatic.com/firebasejs/'+V+'/';
  var ready=null;

  function loginUI(auth,mod){
    return new Promise(function(resolve){
      var ov=document.createElement('div');
      ov.style.cssText='position:fixed;inset:0;z-index:99999;background:var(--bg,#f2f4f3);display:flex;align-items:center;justify-content:center;padding:16px';
      ov.innerHTML='<form style="background:var(--surface,#fff);border:1px solid var(--line,#dce2df);border-radius:14px;padding:22px;width:100%;max-width:340px;display:grid;gap:12px;font-family:var(--f-body,system-ui)">'
       +'<img src="cover.png" alt="" style="width:100%;border-radius:10px;display:block">'
       +'<h2 style="margin:0;font-family:var(--f-display,inherit)">Mercado Inteligente</h2><p style="margin:0;color:var(--muted,#64706b);font-size:.9rem">Entre para acessar o sistema.</p>'
       +'<input type="email" id="lg_e" placeholder="E-mail" autocomplete="username" required style="padding:10px;border-radius:8px;border:1px solid var(--line,#ccc);font:inherit;font-size:16px">'
       +'<input type="password" id="lg_p" placeholder="Senha" autocomplete="current-password" required style="padding:10px;border-radius:8px;border:1px solid var(--line,#ccc);font:inherit;font-size:16px">'
       +'<div id="lg_m" style="color:var(--bad,#b3261e);font-size:.85rem;min-height:1em"></div>'
       +'<button class="primary" style="padding:10px;border-radius:8px;border:0;background:var(--accent,#2447c9);color:#fff;font:inherit;font-weight:700">Entrar</button></form>';
      document.body.appendChild(ov);
      var f=ov.querySelector('form'),m=ov.querySelector('#lg_m');
      f.addEventListener('submit',function(e){
        e.preventDefault();m.textContent='';
        mod.signInWithEmailAndPassword(auth,ov.querySelector('#lg_e').value.trim(),ov.querySelector('#lg_p').value)
          .then(function(){ov.remove();resolve()})
          .catch(function(){m.textContent='E-mail ou senha incorretos.'});
      });
    });
  }

  function boot(){
    if(ready)return ready;
    ready=(async function(){
      if(!cfg.apiKey||String(cfg.apiKey).indexOf('COLE')===0){
        var v=document.getElementById('view');
        if(v)v.innerHTML='<div class="empty"><b>Falta configurar o Firebase.</b><span>Abra o arquivo firebase-config.js e cole a configuração do seu projeto (passo 3 do COMO-PUBLICAR.txt).</span></div>';
        return null;
      }
      var a=await import(B+'firebase-app.js'),f=await import(B+'firebase-firestore.js'),au=await import(B+'firebase-auth.js');
      var app=a.initializeApp(cfg),auth=au.getAuth(app);
      var fs=f.initializeFirestore(app,{ignoreUndefinedProperties:true});
      await new Promise(function(r){var u=au.onAuthStateChanged(auth,function(){u();r()})});
      if(!auth.currentUser)await loginUI(auth,au);
      var topbar=document.querySelector('.monthbar');
      if(topbar){var b=document.createElement('button');b.textContent='Sair';b.onclick=function(){au.signOut(auth).then(function(){location.reload()})};topbar.appendChild(b)}

      function wrapDoc(snap){return {id:snap.id,exists:snap.exists(),data:function(){return snap.data()},metadata:snap.metadata}}
      function wrapQ(q){var docs=q.docs.map(wrapDoc);return {docs:docs,size:q.size,empty:q.empty,docChanges:function(){return []},metadata:q.metadata}}
      function docApi(path){
        var ref=f.doc(fs,path);
        return {id:ref.id,path:path,
          get:function(){return f.getDoc(ref).then(wrapDoc)},
          set:function(d){return f.setDoc(ref,d)},
          update:function(d){return f.setDoc(ref,d,{merge:true})}, /* mescla campos aninhados, como o app espera */
          delete:function(){return f.deleteDoc(ref)},
          onSnapshot:function(ok,err){return f.onSnapshot(ref,function(s){ok(wrapDoc(s))},err)},
          collection:function(c){return colApi(path+'/'+c)}};
      }
      function colApi(path){
        var ref=f.collection(fs,path);
        return {path:path,
          doc:function(id){return docApi(path+'/'+(id||f.doc(ref).id))},
          get:function(){return f.getDocs(ref).then(wrapQ)},
          onSnapshot:function(ok,err){return f.onSnapshot(ref,function(s){ok(wrapQ(s))},err)}};
      }
      return {db:{doc:docApi,collection:colApi}};
    })();
    return ready;
  }

  var downloads={save:function(r){
    try{
      var blob=new Blob([r.data],{type:r.type||'application/octet-stream'}),u=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=u;a.download=r.filename;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},4000);
      return Promise.resolve({status:'saved'});
    }catch(e){return Promise.reject(e)}
  }};

  window.claude={use:function(n){
    if(n==='downloads')return Promise.resolve(downloads);
    if(n==='db')return boot().then(function(x){return x?x.db:null});
    return Promise.resolve(null);
  }};
})();
