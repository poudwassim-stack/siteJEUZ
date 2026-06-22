/* ══════════════════════════════════════════════════════════════
   GSPN — FINAL — Communiqués + Traités + Diplomatie
   ══════════════════════════════════════════════════════════════ */

// L'appel passe par /api/chat (Vercel Serverless) — la clé API n'est JAMAIS exposée
const API_URL = '/api/chat';
const MODELS = ['google/gemma-4-31b-it:free','google/gemma-3-27b-it:free','meta-llama/llama-3.3-70b-instruct:free','qwen/qwen3-next-80b-a3b-instruct:free'];

// ── DATA ──
const load = () => { try { return JSON.parse(localStorage.getItem('gspn') || '{}'); } catch { return {}; } };
const save = d => localStorage.setItem('gspn', JSON.stringify(d));
const nation = () => load().currentNation || null;
const setN = n => { const d = load(); d.currentNation = n; save(d); };
const allComs = () => load().communiques || [];
const addCom = c => {
  const d = load();
  d.communiques = [...(d.communiques||[]), c];
  save(d);

  // SUPABASE
  syncComToSupabase(c);
};
const delCom = id => { const d = load(); d.communiques = (d.communiques||[]).filter(c => c.id !== id); save(d); };
const pubCom = id => { const d = load(); const c = (d.communiques||[]).find(x => x.id === id); if(c){c.published=true;c.date=new Date().toISOString();} save(d); };
const pub = n => allComs().filter(c => c.nation === n && c.published).sort((a,b) => new Date(b.date)-new Date(a.date));
const myDrafts = () => { const n=nation(); return n ? allComs().filter(c=>c.nation===n&&!c.published).sort((a,b)=>new Date(b.date)-new Date(a.date)) : []; };
// ═════════ SUPABASE SYNC ═════════

// COMMUNIQUÉS
async function syncComToSupabase(com) {
  await supabaseClient.from('communiques').insert([com]);
}

// TRAITÉS
async function syncTreatyToSupabase(t) {
  await supabaseClient.from('treaties').insert([t]);
}

// DIPLO
async function syncDiploToSupabase(m) {
  await supabaseClient.from('diplomacy').insert([m]);
}
// Treaties
const allTreaties = () => load().treaties || [];
const addTreaty = t => {
  const d=load();
  d.treaties=[...(d.treaties||[]),t];
  save(d);

  // SUPABASE
  syncTreatyToSupabase(t);
};
const updateTreaty = (id, updates) => { const d=load(); const t=(d.treaties||[]).find(x=>x.id===id); if(t) Object.assign(t, updates); save(d); };

// Diplo messages
const allDiplo = () => load().diplomacy || [];
const addDiplo = m => {
  const d=load();
  d.diplomacy=[...(d.diplomacy||[]),m];
  save(d);

  // SUPABASE
  syncDiploToSupabase(m);
};
const uid = () => Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,5).toUpperCase();
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

let wiz = {step:0,situation:'',tone:'',type:'',severity:'',zone:'',objective:'',details:''};
let generated = null;

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  clock(); setupNav(); setupEntity(); updateUI(); renderPublic();
  // Synchro entre onglets
  window.addEventListener('storage', e => { if(e.key==='gspn') { renderPublic(); const ap=$('.page.active')?.id; if(ap==='page-treaties') renderTreaties(); if(ap==='page-diplo') renderDiplo(); if(ap==='page-editor') renderDrafts(); } });
});

function clock() { const t=()=>{const n=new Date(),e=$('#header-time');if(e)e.textContent=[n.getHours(),n.getMinutes(),n.getSeconds()].map(x=>String(x).padStart(2,'0')).join(':');}; t(); setInterval(t,1000); }

// ── NAV ──
function setupNav() {
  $$('.nav-btn[data-page]').forEach(b => { b.onclick = () => { const p=b.dataset.page; if(['editor','treaties','diplo'].includes(p)&&!nation()){openEntity();return;} goTo(p); }; });
  $('#nav-entity').onclick = openEntity;
}

function goTo(page) {
  $$('.page').forEach(p=>p.classList.remove('active'));
  $$('.nav-btn[data-page]').forEach(b=>b.classList.remove('active'));
  $(`#page-${page}`)?.classList.add('active');
  $(`.nav-btn[data-page="${page}"]`)?.classList.add('active');
  if(page==='public') renderPublic();
  else if(page==='editor') renderEditor();
  else if(page==='treaties') renderTreaties();
  else if(page==='diplo') renderDiplo();
}

// ── ENTITY ──
function setupEntity() {
  const m=$('#modal-entity');
  $('#close-entity').onclick=()=>m.classList.add('hidden');
  m.onclick=e=>{if(e.target===m)m.classList.add('hidden');};
  $$('.entity-option').forEach(b=>{b.onclick=()=>{setN(b.dataset.nation);updateUI();m.classList.add('hidden');goTo('public');toast('Connexion établie','success');};});
}
function openEntity(){$('#modal-entity').classList.remove('hidden');}

function updateUI() {
  const n=nation();
  document.body.classList.remove('nation-pouding','nation-amir');
  $('#nation-indicator').classList.remove('pouding','amir');
  if(n){document.body.classList.add('nation-'+n);$('#nation-indicator').classList.add(n);$('#nation-label').textContent=n==='pouding'?'RFP':'AMIR';$('#nav-entity').querySelector('span:last-child').textContent='Changer';}
  else{$('#nation-label').textContent='NON CONNECTÉ';$('#nav-entity').querySelector('span:last-child').textContent='Accès Entité';}
}

const NN = n => n==='pouding'?'Rép. Féd. Pouding':"État d'Amir";
const NI = n => n==='pouding'?'🦅':'⚔️';
const NF = n => n==='pouding'?'République Fédérale de Pouding':"État d'Amir";

// ══════════════════════════════════════════════
// FIL PUBLIC
// ══════════════════════════════════════════════
function renderPublic() {
  const p=pub('pouding'),a=pub('amir'),all=[...p,...a].sort((x,y)=>new Date(y.date)-new Date(x.date));
  const today=new Date().toDateString();
  $('#total-coms').textContent=all.length;
  $('#today-coms').textContent=all.filter(c=>new Date(c.date).toDateString()===today).length;
  $('#count-pouding').textContent=p.length+' com.';
  $('#count-amir').textContent=a.length+' com.';
  $('#col-pouding').innerHTML=p.length?p.map(card).join(''):empty();
  $('#col-amir').innerHTML=a.length?a.map(card).join(''):empty();
  if(all.length){$('#ticker-text').textContent=all.slice(0,3).map(c=>`${NI(c.nation)} ${c.title}`).join('  ━━  ');}
}

function card(c) {
  const sm={'Faible':'low','Modéré':'mod','Élevé':'high','Critique':'crit'};
  const uno=c.type==='Communication non officielle';
  const fmt=esc(c.content).replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>');
  return `<article class="news-card ${c.nation} ${uno?'unofficial':''}">
    <div class="news-card-header"><div class="news-badges">
      <span class="badge ${uno?'badge-unofficial':'badge-type'}">${esc(c.type)}</span>
      <span class="badge badge-sev ${sm[c.severity]||'low'}">${esc(c.severity)}</span>
      ${c.zone?`<span class="badge badge-zone">📍 ${esc(c.zone)}</span>`:''}
    </div><div class="news-timestamp" title="${fmtDT(c.date)}">🕐 ${ago(c.date)}</div></div>
    <div class="news-card-body"><h3 class="news-title">${esc(c.title)}</h3><div class="news-content"><p>${fmt}</p></div></div>
    <div class="news-card-footer"><div class="news-source"><span>${NI(c.nation)}</span><span>${NN(c.nation)}</span></div><span class="news-id">${c.id}</span></div>
  </article>`;
}

function empty(){return '<div class="empty-feed"><span class="empty-icon">📡</span><p class="empty-text">Aucune transmission</p></div>';}

// ══════════════════════════════════════════════
// EDITOR (inchangé, compact)
// ══════════════════════════════════════════════
function renderEditor() {
  const n=nation();
  if(!n){$('#page-editor').innerHTML='<div class="auth-block"><span class="auth-icon">🔐</span><h3>ACCÈS RESTREINT</h3><p>Identification requise.</p><button class="btn-auth" onclick="openEntity()">🌐 Identifier</button></div>';return;}
  wiz={step:0,situation:'',tone:'',type:'',severity:'',zone:'',objective:'',details:''};generated=null;
  $('#page-editor').innerHTML=`
    <div class="broadcast-header" style="margin-bottom:1.5rem"><div class="broadcast-left"><div class="broadcast-badge" style="background:var(--ai-bg);border-color:var(--ai-border);color:var(--ai)"><span>🤖</span><span>IA</span></div><h2>RÉDACTION</h2></div><div style="display:flex;align-items:center;gap:0.5rem;color:var(--text-dim);font-size:0.8rem">${NI(n)} ${NF(n)}</div></div>
    <div class="editor-layout"><div class="wizard-panel"><div class="wizard-header"><span style="font-size:1.25rem">📝</span><h2>Nouveau communiqué</h2><span class="ai-tag">Gemma 4</span></div>
      <div class="steps-progress">${[0,1,2,3,4].map(i=>`<div class="step-bar" data-step="${i}"></div>`).join('')}</div>
      <div class="wizard-body" id="wbody"></div><div class="wizard-footer" id="wfoot"></div></div>
    <div class="drafts-panel"><div class="drafts-header">📂 Brouillons</div><div class="drafts-list" id="dlist"></div></div></div>`;
  renderStep();renderDrafts();
}

function renderStep(){$$('.step-bar').forEach((b,i)=>{b.classList.remove('done','active');if(i<wiz.step)b.classList.add('done');else if(i===wiz.step)b.classList.add('active');});const B=$('#wbody'),F=$('#wfoot');if(!B||!F)return;[s0,s1,s2,s3,s4,sL][wiz.step](B,F);}

function s0(B,F){B.innerHTML=`<div class="form-step active"><div class="field-group"><label class="field-label">🎯 Situation</label><p class="field-hint">Contexte, événements...</p><textarea class="field-textarea" id="ws" placeholder="Des troupes se massent...">${wiz.situation}</textarea></div></div>`;F.innerHTML=`<button class="btn btn-next" id="bn">Continuer →</button>`;$('#ws').oninput=e=>wiz.situation=e.target.value;$('#bn').onclick=()=>{if(!wiz.situation.trim())return toast('Décrivez la situation','error');wiz.step=1;renderStep();};}

function s1(B,F){const t=[['formal','📜','Formel','Protocolaire'],['threatening','⚠️','Menaçant','Intimidant'],['diplomatic','🤝','Diplomatique','Conciliant'],['urgent','🚨','Urgent','Alerte'],['triumphant','🏆','Triomphant','Victoire'],['defensive','🛡️','Défensif','Justification']];B.innerHTML=`<div class="form-step active"><div class="field-group"><label class="field-label">🎭 Ton</label><div class="options-grid">${t.map(([id,ic,lb,ds])=>`<button class="option-card ${wiz.tone===id?'selected':''}" data-v="${id}"><span class="option-icon">${ic}</span><div><div class="option-label">${lb}</div><div class="option-desc">${ds}</div></div></button>`).join('')}</div></div></div>`;F.innerHTML=`<button class="btn btn-back" id="bb">←</button><button class="btn btn-next" id="bn">→</button>`;$$('.option-card').forEach(b=>{b.onclick=()=>{$$('.option-card').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');wiz.tone=b.dataset.v;};});$('#bb').onclick=()=>{wiz.step=0;renderStep();};$('#bn').onclick=()=>{if(!wiz.tone)return toast('Ton requis','error');wiz.step=2;renderStep();};}

function s2(B,F){const types=[['Communiqué officiel','📋'],['Alerte stratégique','🚨'],['Déclaration diplomatique','🤝'],['Opération militaire','⚔️'],['Information confidentielle','🔒'],['Communication non officielle','📰']];const sevs=[['Faible','🟢'],['Modéré','🟡'],['Élevé','🟠'],['Critique','🔴']];B.innerHTML=`<div class="form-step active"><div class="field-group"><label class="field-label">📁 Type</label><select class="field-select" id="wt"><option value="">— Choisir —</option>${types.map(([id,ic])=>`<option value="${id}" ${wiz.type===id?'selected':''}>${ic} ${id}</option>`).join('')}</select></div><div class="field-group"><label class="field-label">⚡ Gravité</label><div class="options-grid" style="grid-template-columns:repeat(4,1fr)">${sevs.map(([id,ic])=>`<button class="option-card ${wiz.severity===id?'selected':''}" data-s="${id}" style="flex-direction:column;text-align:center;padding:0.7rem"><span style="font-size:1.5rem">${ic}</span><span style="font-size:0.7rem;margin-top:0.2rem">${id}</span></button>`).join('')}</div></div><div class="field-group"><label class="field-label">📍 Zone <span style="color:var(--text-muted);font-weight:400">(opt.)</span></label><input class="field-input" id="wz" value="${wiz.zone}" placeholder="Frontière Nord..."></div></div>`;F.innerHTML=`<button class="btn btn-back" id="bb">←</button><button class="btn btn-next" id="bn">→</button>`;$('#wt').onchange=e=>wiz.type=e.target.value;$('#wz').oninput=e=>wiz.zone=e.target.value;$$('[data-s]').forEach(b=>{b.onclick=()=>{$$('[data-s]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');wiz.severity=b.dataset.s;};});$('#bb').onclick=()=>{wiz.step=1;renderStep();};$('#bn').onclick=()=>{if(!wiz.type)return toast('Type requis','error');if(!wiz.severity)return toast('Gravité requise','error');wiz.step=3;renderStep();};}

function s3(B,F){const o=[['inform','📢','Informer'],['warn','⚠️','Avertir'],['announce','📣','Annoncer'],['respond','💬','Répondre'],['justify','⚖️','Justifier'],['mobilize','🎯','Mobiliser']];B.innerHTML=`<div class="form-step active"><div class="field-group"><label class="field-label">🎯 Objectif</label><div class="options-grid">${o.map(([id,ic,lb])=>`<button class="option-card ${wiz.objective===id?'selected':''}" data-v="${id}"><span class="option-icon">${ic}</span><div><div class="option-label">${lb}</div></div></button>`).join('')}</div></div></div>`;F.innerHTML=`<button class="btn btn-back" id="bb">←</button><button class="btn btn-next" id="bn">→</button>`;$$('.option-card').forEach(b=>{b.onclick=()=>{$$('.option-card').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');wiz.objective=b.dataset.v;};});$('#bb').onclick=()=>{wiz.step=2;renderStep();};$('#bn').onclick=()=>{if(!wiz.objective)return toast('Objectif requis','error');wiz.step=4;renderStep();};}

function s4(B,F){B.innerHTML=`<div class="form-step active"><div class="field-group"><label class="field-label">📝 Détails <span style="color:var(--text-muted);font-weight:400">(opt.)</span></label><textarea class="field-textarea" id="wd" placeholder="Noms, dates, chiffres...">${wiz.details}</textarea></div></div>`;F.innerHTML=`<button class="btn btn-back" id="bb">←</button><button class="btn btn-generate" id="bg">🤖 Générer</button>`;$('#wd').oninput=e=>wiz.details=e.target.value;$('#bb').onclick=()=>{wiz.step=3;renderStep();};$('#bg').onclick=()=>{wiz.step=5;renderStep();callAI();};}

function sL(B,F){B.innerHTML=`<div class="loading-state"><div class="loading-spinner"></div><div class="loading-title">🤖 Génération...</div><div class="loading-sub" id="lst">Connexion...</div></div>`;F.innerHTML='';}

// ── AI ──
async function callAI(){
  const n=nation(),nn=NF(n);
  const tones={formal:'formel',threatening:'menaçant',diplomatic:'diplomatique',urgent:'urgent',triumphant:'triomphant',defensive:'défensif'};
  const objs={inform:'informer',warn:'avertir',announce:'annoncer',respond:'répondre',justify:'justifier',mobilize:'mobiliser'};
  const uno=wiz.type==='Communication non officielle';
  const style=uno?'Communication NON OFFICIELLE. Style: rumeur, source anonyme, "selon nos informations"...':'Communiqué gouvernemental officiel. Style formel et professionnel.';
  const prompt=`Rédige en français un communiqué pour la ${nn} (jeu Rusted Warfare fictif).\n\n${style}\n\n• Situation: ${wiz.situation}\n• Ton: ${tones[wiz.tone]}\n• Type: ${wiz.type}\n• Gravité: ${wiz.severity}\n• Zone: ${wiz.zone||'non spécifiée'}\n• Objectif: ${objs[wiz.objective]}\n${wiz.details?'• Détails: '+wiz.details:''}\n\nTitre EN MAJUSCULES. 3-5 paragraphes. Pas de markdown/**/#. Formule de clôture.\n\nJSON uniquement:\n{"title":"TITRE","content":"Paragraphe 1.\\n\\nParagraphe 2."}`;

  for(const model of MODELS){
    const short=model.split('/')[1].split(':')[0];
    const e=$('#lst');if(e)e.textContent=short+'...';
    try{
      const r=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model,messages:[{role:'user',content:prompt}],temperature:0.75,max_tokens:2000})});
      if(!r.ok)continue;const d=await r.json();let t=d.choices?.[0]?.message?.content;if(!t)continue;
      t=t.trim().replace(/```json\s*/gi,'').replace(/```\s*/gi,'').replace(/<think>[\s\S]*?<\/think>/gi,'');
      const j=t.match(/\{[\s\S]*\}/);if(!j)continue;const p=JSON.parse(j[0]);if(!p.title||!p.content)continue;
      generated={id:'COM-'+uid(),nation:n,title:p.title.replace(/\*\*/g,''),type:wiz.type,zone:wiz.zone,severity:wiz.severity,content:p.content.replace(/\\n/g,'\n').replace(/\*\*/g,'').replace(/\*/g,'').replace(/^#+\s*/gm,'').trim(),date:new Date().toISOString(),published:false};
      openPreview();toast('Généré','success');return;
    }catch{continue;}
  }
  toast('Modèles indisponibles','error');wiz.step=4;renderStep();
}

// ── PREVIEW ──
function openPreview(){
  const c=generated;if(!c)return;
  const m=$('#modal-preview');
  const fmt=esc(c.content).replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>');
  m.querySelector('.preview-modal').innerHTML=`
    <button class="modal-close" id="pclose">✕</button>
    <div class="preview-header"><span>📋</span><h3>APERÇU</h3></div>
    <div id="preview-content"><div class="preview-card">
      <div class="preview-row"><div class="preview-label">Titre</div><div class="preview-value title">${esc(c.title)}</div></div>
      <div class="preview-row"><div class="preview-label">Contenu</div><div class="preview-value content"><p>${fmt}</p></div></div>
      <div class="preview-meta"><div><div class="preview-label">Type</div><div class="preview-value">${esc(c.type)}</div></div><div><div class="preview-label">Gravité</div><div class="preview-value">${esc(c.severity)}</div></div><div><div class="preview-label">Zone</div><div class="preview-value">${c.zone||'—'}</div></div></div>
    </div></div>
    <div class="preview-actions">
      <button class="btn btn-cancel" id="pedit">✏️ Modifier</button>
      <button class="btn btn-draft" id="pdraft">💾 Brouillon</button>
      <button class="btn btn-publish" id="ppub">🚀 Publier</button>
    </div>`;
  m.classList.remove('hidden');
  $('#pclose').onclick=$('#pedit').onclick=()=>{m.classList.add('hidden');wiz.step=4;renderStep();};
  $('#pdraft').onclick=()=>{addCom({...generated});m.classList.add('hidden');toast('Brouillon sauvé','success');renderEditor();};
  $('#ppub').onclick=()=>{m.classList.add('hidden');cfm('🚀','PUBLIER ?','Visible par tous.','Publier',false,()=>{addCom({...generated,published:true});generated=null;toast('Publié !','success');renderEditor();renderPublic();});};
}

// ── DRAFTS ──
function renderDrafts(){
  const d=myDrafts(),el=$('#dlist');if(!el)return;
  if(!d.length){el.innerHTML='<div class="empty-feed" style="padding:2rem"><span class="empty-icon" style="font-size:2rem">📭</span><p class="empty-text">Aucun brouillon</p></div>';return;}
  el.innerHTML=d.map(x=>`<div class="draft-card"><div class="draft-title">${esc(x.title)}</div><div class="draft-meta">${esc(x.type)} · ${fmtD(x.date)}</div><div class="draft-actions"><button class="btn-sm pub" data-id="${x.id}">🚀</button><button class="btn-sm del" data-id="${x.id}">🗑️</button></div></div>`).join('');
  el.querySelectorAll('.pub').forEach(b=>{b.onclick=()=>cfm('🚀','PUBLIER ?','','Publier',false,()=>{pubCom(b.dataset.id);renderDrafts();renderPublic();toast('Publié !','success');});});
  el.querySelectorAll('.del').forEach(b=>{b.onclick=()=>cfm('🗑️','SUPPRIMER ?','','Supprimer',true,()=>{delCom(b.dataset.id);renderDrafts();toast('Supprimé','info');});});
}

// ══════════════════════════════════════════════
// TRAITÉS & ACCORDS
// ══════════════════════════════════════════════
function renderTreaties(){
  const n=nation(),treaties=allTreaties().sort((a,b)=>new Date(b.date)-new Date(a.date));
  const active=treaties.filter(t=>t.status==='accepted');
  const pending=treaties.filter(t=>t.status==='pending'||t.status==='revision');
  const past=treaties.filter(t=>t.status==='rejected');

  let html=`<div class="broadcast-header" style="margin-bottom:1.5rem"><div class="broadcast-left"><div class="broadcast-badge" style="background:rgba(34,197,94,0.1);border-color:rgba(34,197,94,0.2);color:var(--sev-low)"><span>📜</span><span>TRAITÉS</span></div><h2>ACCORDS & TRAITÉS</h2></div><div style="font-size:0.8rem;color:var(--text-dim)">${active.length} traité${active.length!==1?'s':''} en vigueur</div></div>`;

  // Formulaire de proposition
  html+=`<div class="treaty-form"><div class="treaty-form-title">📝 Proposer un traité</div>
    <div class="field-group"><label class="field-label">Titre du traité</label><input class="field-input" id="tt-title" placeholder="Ex: Accord de cessez-le-feu bilatéral"></div>
    <div class="field-group"><label class="field-label">Termes et conditions</label><textarea class="field-textarea" id="tt-content" placeholder="Décrivez les termes du traité, les obligations de chaque partie..."></textarea></div>
    <button class="btn btn-next" id="tt-send" style="margin-top:0.5rem">📨 Envoyer la proposition</button>
  </div>`;

  // Traités en cours
  if(pending.length){
    html+=`<h3 style="font-size:0.85rem;font-weight:700;margin:1.5rem 0 0.75rem;color:var(--sev-mod)">⏳ En attente (${pending.length})</h3>`;
    html+='<div class="treaties-grid">'+pending.map(t=>treatyCard(t,n)).join('')+'</div>';
  }
  if(active.length){
    html+=`<h3 style="font-size:0.85rem;font-weight:700;margin:1.5rem 0 0.75rem;color:var(--sev-low)">✅ En vigueur (${active.length})</h3>`;
    html+='<div class="treaties-grid">'+active.map(t=>treatyCard(t,n)).join('')+'</div>';
  }
  if(past.length){
    html+=`<h3 style="font-size:0.85rem;font-weight:700;margin:1.5rem 0 0.75rem;color:var(--sev-crit)">❌ Rejetés (${past.length})</h3>`;
    html+='<div class="treaties-grid">'+past.map(t=>treatyCard(t,n)).join('')+'</div>';
  }
  if(!treaties.length) html+=empty();

  $('#page-treaties').innerHTML=html;

  // Events
  $('#tt-send').onclick=()=>{
    const title=$('#tt-title').value.trim(),content=$('#tt-content').value.trim();
    if(!title||!content)return toast('Remplissez titre et termes','error');
    addTreaty({id:'TRT-'+uid(),from:n,to:n==='pouding'?'amir':'pouding',title,content,status:'pending',date:new Date().toISOString(),revisionNote:null});
    toast('Proposition envoyée','success');renderTreaties();
  };

  // Boutons d'action sur les traités
  $$('[data-treaty-accept]').forEach(b=>{b.onclick=()=>{updateTreaty(b.dataset.treatyAccept,{status:'accepted'});toast('Traité accepté !','success');renderTreaties();};});
  $$('[data-treaty-reject]').forEach(b=>{b.onclick=()=>{updateTreaty(b.dataset.treatyReject,{status:'rejected'});toast('Traité rejeté','info');renderTreaties();};});
  $$('[data-treaty-revise]').forEach(b=>{b.onclick=()=>{
    const note=prompt('Quelle révision demandez-vous ?');
    if(note&&note.trim()){updateTreaty(b.dataset.treatyRevise,{status:'revision',revisionNote:note.trim(),revisionFrom:n});toast('Demande de révision envoyée','info');renderTreaties();}
  };});
}

function treatyCard(t,myNation){
  const statusLabels={pending:'En attente',accepted:'Accepté',rejected:'Rejeté',revision:'Révision demandée'};
  const canAct = t.to===myNation && t.status==='pending';
  const canActRevision = t.from===myNation && t.status==='revision';
  const isMyProposal = t.from===myNation;

  let actions='';
  if(canAct){
    actions=`<div class="treaty-actions">
      <button class="btn btn-accept" data-treaty-accept="${t.id}">✅ Accepter</button>
      <button class="btn btn-revision" data-treaty-revise="${t.id}">📝 Révision</button>
      <button class="btn btn-reject" data-treaty-reject="${t.id}">❌ Rejeter</button>
    </div>`;
  } else if(canActRevision){
    actions=`<div class="treaty-actions">
      <button class="btn btn-accept" data-treaty-accept="${t.id}">✅ Accepter la révision</button>
      <button class="btn btn-revision" data-treaty-revise="${t.id}">📝 Contre-proposition</button>
      <button class="btn btn-reject" data-treaty-reject="${t.id}">❌ Abandonner</button>
    </div>`;
  }

  return `<div class="treaty-card">
    <div class="treaty-top">
      <div style="display:flex;align-items:center;gap:0.5rem">
        <span>${NI(t.from)}</span><span style="font-size:0.75rem;color:var(--text-dim)">→</span><span>${NI(t.to)}</span>
      </div>
      <span class="treaty-status ${t.status}">${statusLabels[t.status]}</span>
    </div>
    <div class="treaty-body">
      <div class="treaty-title">${esc(t.title)}</div>
      <div class="treaty-content">${esc(t.content)}</div>
      ${t.revisionNote?`<div class="treaty-revision-note"><strong>${NI(t.revisionFrom)} Demande de révision :</strong> ${esc(t.revisionNote)}</div>`:''}
      <div class="treaty-meta">
        <span>Proposé par ${NN(t.from)}</span>
        <span>${fmtDT(t.date)}</span>
        <span>${t.id}</span>
      </div>
    </div>
    ${actions}
  </div>`;
}

// ══════════════════════════════════════════════
// CANAL DIPLOMATIQUE PRIVÉ
// ══════════════════════════════════════════════
function renderDiplo(){
  const n=nation();
  const msgs=allDiplo().sort((a,b)=>new Date(a.date)-new Date(b.date));
  const other=n==='pouding'?'amir':'pouding';

  let msgsHtml='';
  if(!msgs.length){
    msgsHtml=`<div class="diplo-empty"><span>🕊️</span><p>Canal diplomatique vide</p><p style="font-size:0.75rem">Envoyez le premier message</p></div>`;
  } else {
    msgsHtml=msgs.map(m=>`<div class="diplo-msg ${m.from}">
      <div class="diplo-msg-sender">${NI(m.from)} ${NN(m.from)}</div>
      <div class="diplo-msg-text">${esc(m.text).replace(/\n/g,'<br>')}</div>
      <div class="diplo-msg-time">${ago(m.date)}</div>
    </div>`).join('');
  }

  $('#page-diplo').innerHTML=`
    <div class="diplo-container">
      <div class="diplo-header">
        <h3>💬 Canal Diplomatique — ${NI('pouding')} / ${NI('amir')}</h3>
        <div class="diplo-encrypted">🔒 CHIFFRÉ</div>
      </div>
      <div class="diplo-messages" id="diplo-msgs">${msgsHtml}</div>
      <div class="diplo-input-area">
        <textarea class="diplo-input" id="diplo-input" placeholder="Votre message diplomatique..." rows="1"></textarea>
        <button class="diplo-send" id="diplo-send">Envoyer</button>
      </div>
    </div>`;

  // Scroll en bas
  const container=$('#diplo-msgs');
  if(container) container.scrollTop=container.scrollHeight;

  // Events
  $('#diplo-send').onclick=sendDiplo;
  $('#diplo-input').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendDiplo();}};
}

function sendDiplo(){
  const input=$('#diplo-input');
  const text=input.value.trim();
  if(!text)return;
  addDiplo({id:'DPL-'+uid(),from:nation(),text,date:new Date().toISOString()});
  input.value='';
  renderDiplo();
}

// ══════════════════════════════════════════════
// CONFIRM + TOAST + UTILS
// ══════════════════════════════════════════════
function cfm(icon,title,text,okText,isDel,onOk){
  const m=$('#modal-confirm');
  m.querySelector('.confirm-modal').innerHTML=`<span class="confirm-icon">${icon}</span><h3>${esc(title)}</h3><p>${esc(text)}</p><div class="confirm-actions"><button class="btn btn-cancel" id="cc">Annuler</button><button class="btn btn-ok ${isDel?'delete':''}" id="cok">${esc(okText)}</button></div>`;
  m.classList.remove('hidden');
  $('#cc').onclick=()=>m.classList.add('hidden');
  $('#cok').onclick=()=>{m.classList.add('hidden');onOk();};
  m.onclick=e=>{if(e.target===m)m.classList.add('hidden');};
}

function toast(msg,type='info'){const t=document.createElement('div');t.className=`toast ${type}`;t.textContent=msg;$('#toast-container').appendChild(t);setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),250);},4000);}

function ago(iso){const s=Math.floor((Date.now()-new Date(iso))/1000);if(s<60)return"À l'instant";if(s<3600)return Math.floor(s/60)+'min';if(s<86400)return Math.floor(s/3600)+'h';if(s<604800)return Math.floor(s/86400)+'j';return fmtDT(iso);}
function fmtD(i){const d=new Date(i);return`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;}
function fmtDT(i){const d=new Date(i);return`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}
function esc(s){if(!s)return'';const d=document.createElement('div');d.textContent=s;return d.innerHTML;}
