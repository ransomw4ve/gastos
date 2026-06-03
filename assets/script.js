/* ══════════════════════════════════════════════
   GASTOS APP — script.js
   Reemplaza localStorage con Supabase Auth + DB
   ══════════════════════════════════════════════ */

/* ─────────────────────────────────────────────
   ⚠️  CONFIGURACIÓN — COMPLETAR CON TUS DATOS
   Supabase → Project Settings → API
   ───────────────────────────────────────────── */
const SUPABASE_URL  = 'https://vkmzhmkvnrrggncnzwqs.supabase.co';   
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbXpobWt2bnJyZ2duY256d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTI0NTgsImV4cCI6MjA5NjA2ODQ1OH0.U-HriHeg69z4CFx4PmiSWN8FroVcfTcxYy_j5Obw-AA';            

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

/* ─────────── CONFIG ─────────── */
const EMOJIS = ['🏷','⚡','🛒','🍎','🚗','💊','🏠','🎓','🎬','👗','🐾','✈️','🍔','☕','🔧','📱','💡','🎮','🏋️','📚','💼','🎁','🌿','🏥','🚌','⛽','🍕','🧾','💈','💰','🎵','🖥️','🐶','👶','🌊','🏖️','🍷','🎂','🔑','🏋'];

const COLORS = [
  {bg:'#E6F1FB',text:'#185FA5',bar:'#378ADD',name:'Azul'},
  {bg:'#FAEEDA',text:'#854F0B',bar:'#EF9F27',name:'Naranja'},
  {bg:'#EAF3DE',text:'#3B6D11',bar:'#639922',name:'Verde'},
  {bg:'#FBEAF0',text:'#993556',bar:'#D4537E',name:'Rosa'},
  {bg:'#E1F5EE',text:'#0F6E56',bar:'#1D9E75',name:'Turquesa'},
  {bg:'#EEEDFE',text:'#534AB7',bar:'#7F77DD',name:'Violeta'},
  {bg:'#FEF3ED',text:'#9C3D0D',bar:'#E8672B',name:'Rojo'},
  {bg:'#F0F0F0',text:'#444',   bar:'#888',   name:'Gris'},
  {bg:'#FDE8FB',text:'#7B1FA2',bar:'#AB47BC',name:'Púrpura'},
  {bg:'#E3F2FD',text:'#0D47A1',bar:'#1E88E5',name:'Celeste'},
  {bg:'#FFF3E0',text:'#E65100',bar:'#FB8C00',name:'Ámbar'},
  {bg:'#F3E5F5',text:'#6A1B9A',bar:'#8E24AA',name:'Magenta'},
];

const DEFAULT_CATS = {
  servicios:  {label:'Servicios', emoji:'⚡', ...COLORS[0]},
  compras:    {label:'Compras',   emoji:'🛒', ...COLORS[1]},
  alimentos:  {label:'Alimentos', emoji:'🍎', ...COLORS[2]},
  transporte: {label:'Transporte',emoji:'🚗', ...COLORS[3]},
  salud:      {label:'Salud',     emoji:'💊', ...COLORS[4]},
  otros:      {label:'Otros',     emoji:'🏷', ...COLORS[5]},
};

/* ─────────── STATE ─────────── */
let CATS     = {};
let expenses = [];
let currentUser = null;

const MONTHS=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

/* ─────────── HELPERS ─────────── */
function fmt(n){ return '$'+Math.round(n).toLocaleString('es-AR'); }
function fmtFull(n){ return '$'+n.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtDate(d){ if(!d)return''; const[y,m,day]=d.split('-'); return`${day}/${m}/${y}`; }
function getYears(){ return[...new Set(expenses.map(e=>e.date.slice(0,4)))].sort().reverse(); }
function getCat(k){ return CATS[k]||CATS.otros||{label:k,emoji:'🏷',bg:'#eee',text:'#555',bar:'#888'}; }
function slugify(s){ return s.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'').replace(/_+/g,'_').slice(0,20)||'cat_'+Date.now(); }

function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2500);
}

function setLoading(id, on){
  const el = document.getElementById(id);
  if(!el) return;
  if(on) el.innerHTML='<div class="loading">Cargando...</div>';
}

/* ══════════════════════════════════════════════
   AUTH — Login / Registro / Logout
   ══════════════════════════════════════════════ */

function switchTab(tab){
  document.getElementById('form-login').style.display    = tab==='login'    ? '' : 'none';
  document.getElementById('form-register').style.display = tab==='register' ? '' : 'none';
  document.getElementById('tab-login').classList.toggle('active',    tab==='login');
  document.getElementById('tab-register').classList.toggle('active', tab==='register');
  hideAuthMsg();
}

function showAuthMsg(msg, type='error'){
  const el = document.getElementById('auth-msg');
  el.textContent = msg;
  el.className = 'auth-msg ' + type;
}
function hideAuthMsg(){
  const el = document.getElementById('auth-msg');
  el.className = 'auth-msg';
}

async function doLogin(){
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  if(!email||!pass){ showAuthMsg('Completá email y contraseña.'); return; }
  const btn = document.getElementById('btn-login');
  btn.textContent='Entrando...'; btn.disabled=true;
  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
  btn.textContent='Entrar'; btn.disabled=false;
  if(error) showAuthMsg(translateAuthError(error.message));
  // Si el login OK, onAuthStateChange se encarga del resto
}

async function doRegister(){
  const email  = document.getElementById('reg-email').value.trim();
  const pass   = document.getElementById('reg-pass').value;
  const pass2  = document.getElementById('reg-pass2').value;
  if(!email||!pass||!pass2){ showAuthMsg('Completá todos los campos.'); return; }
  if(pass!==pass2){ showAuthMsg('Las contraseñas no coinciden.'); return; }
  if(pass.length<6){ showAuthMsg('La contraseña debe tener al menos 6 caracteres.'); return; }
  const btn = document.getElementById('btn-register');
  btn.textContent='Creando cuenta...'; btn.disabled=true;
  const { error } = await sb.auth.signUp({ email, password: pass });
  btn.textContent='Crear cuenta'; btn.disabled=false;
  if(error){ showAuthMsg(translateAuthError(error.message)); return; }
  showAuthMsg('¡Cuenta creada! Revisá tu email para confirmar la cuenta.', 'success');
}

async function doForgot(){
  const email = document.getElementById('login-email').value.trim();
  if(!email){ showAuthMsg('Ingresá tu email primero.'); return; }
  const { error } = await sb.auth.resetPasswordForEmail(email);
  if(error){ showAuthMsg(translateAuthError(error.message)); return; }
  showAuthMsg('Te enviamos un email para restablecer tu contraseña.', 'success');
}

async function doLogout(){
  await sb.auth.signOut();
  // onAuthStateChange se encarga de mostrar la pantalla de login
}

function translateAuthError(msg){
  if(msg.includes('Invalid login'))      return 'Email o contraseña incorrectos.';
  if(msg.includes('Email not confirmed')) return 'Confirmá tu email antes de entrar.';
  if(msg.includes('already registered')) return 'Ese email ya tiene una cuenta.';
  if(msg.includes('Password should'))    return 'La contraseña debe tener al menos 6 caracteres.';
  return msg;
}

/* Escuchar cambios de sesión (login / logout automático) */
sb.auth.onAuthStateChange(async (event, session) => {
  if(session?.user){
    currentUser = session.user;
    showApp();
    await loadAllData();
  } else {
    currentUser = null;
    showAuth();
  }
});

function showAuth(){
  document.getElementById('auth-screen').style.display = '';
  document.getElementById('app-screen').style.display  = 'none';
}
function showApp(){
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display  = '';
  const email = currentUser?.email || '';
  document.getElementById('user-info').textContent = email;
}

/* ══════════════════════════════════════════════
   CARGA DE DATOS desde Supabase
   ══════════════════════════════════════════════ */

async function loadAllData(){
  await Promise.all([loadCats(), loadExpenses()]);
  populateYearMonth('f-year','f-month');
  populateYearMonth('gf-year','gf-month');
  refreshCatSelects();
  renderList();
}

async function loadCats(){
  const { data, error } = await sb
    .from('categories')
    .select('*')
    .order('created_at');

  if(error){ console.error('Error cargando categorías:', error); return; }

  if(!data || data.length === 0){
    // Primera vez: insertar categorías por defecto
    await insertDefaultCats();
    return;
  }

  CATS = {};
  data.forEach(row => {
    CATS[row.key] = {
      label: row.label,
      emoji: row.emoji,
      bg:    row.bg,
      text:  row.text_color,
      bar:   row.bar,
    };
  });
}

async function insertDefaultCats(){
  const rows = Object.entries(DEFAULT_CATS).map(([key, c]) => ({
    user_id:    currentUser.id,
    key,
    label:      c.label,
    emoji:      c.emoji,
    bg:         c.bg,
    text_color: c.text,
    bar:        c.bar,
  }));
  const { error } = await sb.from('categories').insert(rows);
  if(error){ console.error('Error insertando cats default:', error); return; }
  CATS = JSON.parse(JSON.stringify(DEFAULT_CATS));
}

async function loadExpenses(){
  const { data, error } = await sb
    .from('expenses')
    .select('*')
    .order('date', { ascending: false });

  if(error){ console.error('Error cargando gastos:', error); return; }

  expenses = (data || []).map(row => ({
    id:     row.id,
    desc:   row.description,
    amount: parseFloat(row.amount),
    date:   row.date,
    cat:    row.category,
    note:   row.note || '',
  }));
}

/* ══════════════════════════════════════════════
   CRUD GASTOS — Supabase
   ══════════════════════════════════════════════ */

async function saveExpense(){
  const desc   = document.getElementById('em-desc').value.trim();
  const amount = parseFloat(document.getElementById('em-amount').value);
  const date   = document.getElementById('em-date').value;
  const cat    = document.getElementById('em-cat').value;
  const note   = document.getElementById('em-note').value.trim();
  const id     = parseInt(document.getElementById('em-id').value) || 0;

  if(!desc||isNaN(amount)||amount<=0||!date){
    alert('Completá descripción, monto y fecha.'); return;
  }

  if(id){
    // Actualizar
    const { error } = await sb
      .from('expenses')
      .update({ description:desc, amount, date, category:cat, note })
      .eq('id', id);
    if(error){ alert('Error al actualizar: '+error.message); return; }
    const idx = expenses.findIndex(e=>e.id===id);
    if(idx>-1) expenses[idx] = {id, desc, amount, date, cat, note};
    toast('Gasto actualizado ✓');
  } else {
    // Insertar
    const { data, error } = await sb
      .from('expenses')
      .insert({ user_id:currentUser.id, description:desc, amount, date, category:cat, note })
      .select()
      .single();
    if(error){ alert('Error al guardar: '+error.message); return; }
    expenses.unshift({ id:data.id, desc, amount, date, cat, note });
    toast('Gasto agregado ✓');
  }

  closeExpModal();
  populateYearMonth('f-year','f-month');
  populateYearMonth('gf-year','gf-month');
  renderList();
}

async function deleteExpense(id){
  if(!confirm('¿Eliminar este gasto?')) return;
  const { error } = await sb.from('expenses').delete().eq('id', id);
  if(error){ alert('Error al eliminar: '+error.message); return; }
  expenses = expenses.filter(e=>e.id!==id);
  renderList();
  toast('Gasto eliminado');
}

/* ══════════════════════════════════════════════
   CRUD CATEGORÍAS — Supabase
   ══════════════════════════════════════════════ */

async function saveCat(){
  const name    = document.getElementById('cm-name').value.trim();
  if(!name){ alert('Ingresá un nombre para la categoría.'); return; }
  const editKey = document.getElementById('cm-key').value;
  const c       = COLORS[_cmColorIdx];
  const catData = { label:name, emoji:_cmEmoji, bg:c.bg, text_color:c.text, bar:c.bar };

  if(editKey && CATS[editKey]){
    // Actualizar
    const { error } = await sb
      .from('categories')
      .update(catData)
      .eq('user_id', currentUser.id)
      .eq('key', editKey);
    if(error){ alert('Error al actualizar: '+error.message); return; }
    CATS[editKey] = { label:name, emoji:_cmEmoji, bg:c.bg, text:c.text, bar:c.bar };
    toast(`Categoría "${name}" actualizada ✓`);
  } else {
    // Insertar nueva
    let key = slugify(name);
    if(CATS[key]) key = key+'_'+Date.now();
    const { error } = await sb
      .from('categories')
      .insert({ user_id:currentUser.id, key, ...catData });
    if(error){ alert('Error al crear: '+error.message); return; }
    CATS[key] = { label:name, emoji:_cmEmoji, bg:c.bg, text:c.text, bar:c.bar };
    toast(`Categoría "${name}" creada ✓`);
  }

  closeCatModal();
  renderCatGrid();
  refreshCatSelects();
}

async function deleteCat(key){
  if(expenses.some(e=>e.cat===key)){
    alert('Esta categoría tiene gastos asignados. Reasignalos antes de eliminarla.'); return;
  }
  if(!confirm(`¿Eliminar la categoría "${CATS[key].label}"?`)) return;
  const { error } = await sb
    .from('categories')
    .delete()
    .eq('user_id', currentUser.id)
    .eq('key', key);
  if(error){ alert('Error al eliminar: '+error.message); return; }
  delete CATS[key];
  renderCatGrid();
  refreshCatSelects();
  toast('Categoría eliminada');
}

/* ══════════════════════════════════════════════
   CSV — Import / Export
   ══════════════════════════════════════════════ */

function exportCSV(){
  const rows=[['Fecha','Descripción','Categoría','Monto','Nota']];
  [...expenses].sort((a,b)=>b.date.localeCompare(a.date)).forEach(e=>{
    rows.push([e.date, e.desc, getCat(e.cat).label, e.amount.toFixed(2), e.note||'']);
  });
  const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a');
  a.href='data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv);
  a.download='gastos_'+new Date().toISOString().slice(0,10)+'.csv';
  a.click(); toast('CSV exportado ✓');
}

async function importCSV(input){
  const file=input.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=async ev=>{
    const lines=ev.target.result.split('\n').slice(1);
    const rows=[];
    lines.forEach(line=>{
      const parts=line.split(',').map(p=>p.replace(/^"|"$/g,'').trim());
      if(parts.length<4) return;
      const [date,desc,catLabel,,note=''] = parts;
      const amount=parseFloat(parts[3]);
      if(!date||!desc||isNaN(amount)) return;
      const cat=Object.entries(CATS).find(([k,c])=>c.label.toLowerCase()===catLabel.toLowerCase())?.[0]||'otros';
      rows.push({ user_id:currentUser.id, description:desc, amount, date, category:cat, note });
    });
    if(!rows.length){ toast('No se encontraron datos válidos'); return; }
    const { error } = await sb.from('expenses').insert(rows);
    if(error){ alert('Error al importar: '+error.message); return; }
    await loadExpenses();
    populateYearMonth('f-year','f-month');
    populateYearMonth('gf-year','gf-month');
    renderList(); renderTable();
    toast(`${rows.length} gastos importados ✓`);
  };
  reader.readAsText(file); input.value='';
}

async function clearAll(){
  if(!confirm('¿Borrar TODOS tus gastos? Esta acción no se puede deshacer.')) return;
  const { error } = await sb.from('expenses').delete().eq('user_id', currentUser.id);
  if(error){ alert('Error: '+error.message); return; }
  expenses=[]; renderList(); renderTable(); toast('Gastos eliminados');
}

/* ══════════════════════════════════════════════
   UI — Selectores, filtros, navegación
   ══════════════════════════════════════════════ */

function buildCatOptions(includeAll, selectedKey){
  let html = includeAll ? '<option value="all">Todas las categorías</option>' : '';
  Object.entries(CATS).forEach(([k,c])=>{
    html += `<option value="${k}"${k===selectedKey?' selected':''}>${c.emoji} ${c.label}</option>`;
  });
  return html;
}
function refreshCatSelects(selectedKey){
  ['f-cat','gf-cat'].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    const prev=el.value;
    el.innerHTML=buildCatOptions(true);
    if(CATS[prev]) el.value=prev;
  });
  const mc=document.getElementById('em-cat'); if(!mc) return;
  const prev=mc.value;
  mc.innerHTML=buildCatOptions(false, selectedKey||prev);
  if(!CATS[mc.value]) mc.value=Object.keys(CATS)[0]||'';
}
function populateYearMonth(yId,mId){
  const yrs=getYears();
  const yEl=document.getElementById(yId), mEl=document.getElementById(mId);
  if(!yEl||!mEl) return;
  const cy=yEl.value, cm=mEl.value;
  yEl.innerHTML='<option value="all">Todos los años</option>'+yrs.map(y=>`<option value="${y}">${y}</option>`).join('');
  if(yrs.includes(cy)) yEl.value=cy;
  mEl.innerHTML='<option value="all">Todos los meses</option>'+MONTHS.map((m,i)=>`<option value="${String(i+1).padStart(2,'0')}">${m}</option>`).join('');
  if(cm) mEl.value=cm;
}
function getFiltered(yId,mId,cId,sId){
  const y=document.getElementById(yId).value;
  const m=document.getElementById(mId).value;
  const c=document.getElementById(cId).value;
  const q=sId?document.getElementById(sId).value.toLowerCase():'';
  return expenses.filter(e=>{
    if(y!=='all'&&!e.date.startsWith(y)) return false;
    if(m!=='all'&&e.date.slice(5,7)!==m) return false;
    if(c!=='all'&&e.cat!==c) return false;
    if(q&&!e.desc.toLowerCase().includes(q)&&!(e.note||'').toLowerCase().includes(q)) return false;
    return true;
  });
}

function goTo(page,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  el.classList.add('active');
  if(page==='gastos')     renderList();
  if(page==='graficos')   renderCharts();
  if(page==='categorias') renderCatGrid();
  if(page==='datos')      renderTable();
}

function toggleTheme(){
  const dark=document.documentElement.getAttribute('data-theme')==='dark';
  document.documentElement.setAttribute('data-theme',dark?'':'dark');
  document.getElementById('theme-label').textContent=dark?'Modo oscuro':'Modo claro';
  localStorage.setItem('gastos_theme',dark?'':'dark');
  if(document.getElementById('page-graficos').classList.contains('active')) renderCharts();
}

/* ══════════════════════════════════════════════
   MODAL GASTO
   ══════════════════════════════════════════════ */
function openExpModal(id){
  refreshCatSelects();
  document.getElementById('em-id').value=id||'';
  if(id){
    const e=expenses.find(x=>x.id===id); if(!e) return;
    document.getElementById('exp-modal-title').textContent='Editar gasto';
    document.getElementById('em-desc').value=e.desc;
    document.getElementById('em-amount').value=e.amount;
    document.getElementById('em-date').value=e.date;
    document.getElementById('em-note').value=e.note||'';
    refreshCatSelects(e.cat);
  } else {
    document.getElementById('exp-modal-title').textContent='Nuevo gasto';
    document.getElementById('em-desc').value='';
    document.getElementById('em-amount').value='';
    document.getElementById('em-date').valueAsDate=new Date();
    document.getElementById('em-note').value='';
  }
  document.getElementById('exp-modal').classList.add('open');
  setTimeout(()=>document.getElementById('em-desc').focus(),50);
}
function closeExpModal(){ document.getElementById('exp-modal').classList.remove('open'); }

/* ══════════════════════════════════════════════
   RENDER LISTA
   ══════════════════════════════════════════════ */
function renderList(){
  populateYearMonth('f-year','f-month');
  const filtered=getFiltered('f-year','f-month','f-cat','f-search');
  const sorted=[...filtered].sort((a,b)=>b.date.localeCompare(a.date));
  const total=filtered.reduce((s,e)=>s+e.amount,0);
  const amounts=filtered.map(e=>e.amount);
  document.getElementById('s-total').textContent=fmtFull(total);
  document.getElementById('s-count').textContent=filtered.length;
  document.getElementById('s-avg').textContent=filtered.length?fmt(total/filtered.length):'$0';
  document.getElementById('s-max').textContent=amounts.length?fmtFull(Math.max(...amounts)):'$0';
  const allDates=expenses.map(e=>e.date).sort();
  document.getElementById('period-label').textContent=allDates.length?fmtDate(allDates[0])+' → '+fmtDate(allDates[allDates.length-1]):'Sin datos';
  const el=document.getElementById('expense-list');
  if(!sorted.length){ el.innerHTML='<div class="empty">Sin resultados para el filtro seleccionado.</div>'; return; }
  el.innerHTML=sorted.map(e=>{
    const c=getCat(e.cat);
    return `<div class="expense-item">
      <div class="exp-icon" style="background:${c.bg}">${c.emoji}</div>
      <div class="exp-info">
        <div class="exp-desc">${e.desc}</div>
        <div class="exp-meta">${fmtDate(e.date)} · <span style="color:${c.text};font-weight:500">${c.label}</span>${e.note?' · <em style="color:var(--text3)">'+e.note+'</em>':''}</div>
      </div>
      <div class="exp-amount">${fmtFull(e.amount)}</div>
      <div class="exp-actions">
        <button class="icon-btn edit" onclick="openExpModal(${e.id})" title="Editar">✏️</button>
        <button class="icon-btn del"  onclick="deleteExpense(${e.id})" title="Eliminar">🗑</button>
      </div>
    </div>`;
  }).join('');
}

/* ══════════════════════════════════════════════
   RENDER GRÁFICOS
   ══════════════════════════════════════════════ */
function renderCharts(){
  populateYearMonth('gf-year','gf-month');
  const filtered=getFiltered('gf-year','gf-month','gf-cat',null);
  const total=filtered.reduce((s,e)=>s+e.amount,0);
  const amounts=filtered.map(e=>e.amount);
  document.getElementById('g-total').textContent=fmtFull(total);
  document.getElementById('g-max').textContent=amounts.length?fmtFull(Math.max(...amounts)):'$0';
  document.getElementById('g-min').textContent=amounts.length?fmtFull(Math.min(...amounts)):'$0';
  const byM={};
  filtered.forEach(e=>{const k=e.date.slice(0,7); byM[k]=(byM[k]||0)+e.amount;});
  const mKeys=Object.keys(byM).sort();
  const maxM=Math.max(...Object.values(byM),1);
  const mEl=document.getElementById('chart-monthly');
  mEl.innerHTML=!mKeys.length?'<div class="empty" style="width:100%">Sin datos</div>':
    mKeys.map(k=>{
      const pct=Math.round((byM[k]/maxM)*90);
      const[yr,mo]=k.split('-');
      const lbl=MONTHS[parseInt(mo)-1].slice(0,3)+" '"+yr.slice(2);
      return`<div class="m-col">
        <div class="m-bar" style="height:${pct}%;background:var(--accent)">
          <div class="m-tip">${lbl}: ${fmt(byM[k])}</div>
        </div>
        <div class="m-lbl">${lbl}</div>
      </div>`;
    }).join('');
  const byC={};
  filtered.forEach(e=>{byC[e.cat]=(byC[e.cat]||0)+e.amount;});
  const sortedC=Object.entries(byC).sort((a,b)=>b[1]-a[1]);
  const maxC=Math.max(...Object.values(byC),1);
  const cEl=document.getElementById('chart-cats');
  cEl.innerHTML=!sortedC.length?'<div class="empty">Sin datos</div>':
    sortedC.map(([cat,val])=>{
      const c=getCat(cat);
      const pct=Math.round((val/maxC)*100);
      const pctT=total>0?Math.round((val/total)*100):0;
      return`<div class="bar-row">
        <div class="bar-label">${c.emoji} ${c.label}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${c.bar}">
          <span class="bar-val">${fmt(val)} (${pctT}%)</span>
        </div></div>
      </div>`;
    }).join('');
  const canvas=document.getElementById('donut-canvas');
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,120,120);
  const legEl=document.getElementById('donut-legend');
  if(!sortedC.length){legEl.innerHTML='<div class="empty">Sin datos</div>';return;}
  let angle=-Math.PI/2;
  legEl.innerHTML='';
  sortedC.forEach(([cat,val])=>{
    const c=getCat(cat);
    const slice=(val/total)*Math.PI*2;
    ctx.beginPath();ctx.moveTo(60,60);ctx.arc(60,60,50,angle,angle+slice);ctx.closePath();
    ctx.fillStyle=c.bar;ctx.fill();
    angle+=slice;
    const pct=total>0?Math.round((val/total)*100):0;
    legEl.innerHTML+=`<div class="legend-item"><div class="legend-dot" style="background:${c.bar}"></div><span>${c.emoji} ${c.label}</span><span class="legend-pct">${pct}%</span></div>`;
  });
  ctx.beginPath();ctx.arc(60,60,30,0,Math.PI*2);
  ctx.fillStyle=document.documentElement.getAttribute('data-theme')==='dark'?'#232325':'#fff';
  ctx.fill();
}

/* ══════════════════════════════════════════════
   RENDER TABLA
   ══════════════════════════════════════════════ */
function renderTable(){
  const t=document.getElementById('data-table');
  t.innerHTML=`<thead><tr style="border-bottom:1px solid var(--border)">
    <th style="text-align:left;padding:8px 10px;color:var(--text2);font-weight:500;font-size:12px">Fecha</th>
    <th style="text-align:left;padding:8px 10px;color:var(--text2);font-weight:500;font-size:12px">Descripción</th>
    <th style="text-align:left;padding:8px 10px;color:var(--text2);font-weight:500;font-size:12px">Categoría</th>
    <th style="text-align:right;padding:8px 10px;color:var(--text2);font-weight:500;font-size:12px">Monto</th>
    <th style="padding:8px 4px"></th>
  </tr></thead><tbody>${
    [...expenses].sort((a,b)=>b.date.localeCompare(a.date)).map(e=>{
      const c=getCat(e.cat);
      return`<tr style="border-bottom:1px solid var(--border)" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background=''">
        <td style="padding:8px 10px;font-size:13px;color:var(--text2);white-space:nowrap">${fmtDate(e.date)}</td>
        <td style="padding:8px 10px;font-size:13px">${e.desc}${e.note?`<br><span style="font-size:11px;color:var(--text3)">${e.note}</span>`:''}</td>
        <td style="padding:8px 10px"><span style="background:${c.bg};color:${c.text};font-size:12px;padding:2px 8px;border-radius:10px;font-weight:500;white-space:nowrap">${c.emoji} ${c.label}</span></td>
        <td style="padding:8px 10px;text-align:right;font-size:13px;font-weight:600;white-space:nowrap">${fmtFull(e.amount)}</td>
        <td style="padding:8px 4px;text-align:center;white-space:nowrap">
          <button onclick="openExpModal(${e.id})" style="border:none;background:none;cursor:pointer;padding:3px">✏️</button>
          <button onclick="deleteExpense(${e.id})" style="border:none;background:none;cursor:pointer;padding:3px">🗑</button>
        </td>
      </tr>`;
    }).join('')
  }</tbody>`;
}

/* ══════════════════════════════════════════════
   RENDER GRID CATEGORÍAS
   ══════════════════════════════════════════════ */
function renderCatGrid(){
  const grid=document.getElementById('cat-grid');
  const keys=Object.keys(CATS);
  if(!keys.length){ grid.innerHTML='<p style="color:var(--text3);font-size:14px">No hay categorías.</p>'; return; }
  const counts={};
  expenses.forEach(e=>{counts[e.cat]=(counts[e.cat]||0)+1;});
  grid.innerHTML=keys.map(k=>{
    const c=CATS[k];
    const n=counts[k]||0;
    const canDel=n===0;
    return`<div class="cat-card">
      <div class="cat-icon" style="background:${c.bg}">${c.emoji}</div>
      <div class="cat-info">
        <div class="cat-name">${c.label}</div>
        <div class="cat-count">${n===0?'Sin gastos':n+' gasto'+(n!==1?'s':'')}</div>
      </div>
      <div class="cat-actions">
        <button class="icon-btn edit" onclick="openCatModal('${k}')" title="Editar categoría">✏️</button>
        ${canDel
          ?`<button class="icon-btn del" onclick="deleteCat('${k}')" title="Eliminar">🗑</button>`
          :`<button class="icon-btn" title="Tiene gastos" style="opacity:.25;cursor:not-allowed">🗑</button>`}
      </div>
    </div>`;
  }).join('');
}

/* ══════════════════════════════════════════════
   MODAL CATEGORÍA
   ══════════════════════════════════════════════ */
let _cmEmoji='🏷';
let _cmColorIdx=5;

function openCatModal(key){
  const isEdit=!!(key&&CATS[key]);
  _cmEmoji    = isEdit ? CATS[key].emoji : '🏷';
  _cmColorIdx = isEdit ? COLORS.findIndex(c=>c.bar===CATS[key].bar) : 5;
  if(_cmColorIdx<0) _cmColorIdx=5;
  document.getElementById('cat-modal-title').textContent = isEdit ? 'Editar categoría' : 'Nueva categoría';
  document.getElementById('cm-name').value = isEdit ? CATS[key].label : '';
  document.getElementById('cm-key').value  = key||'';
  document.getElementById('cm-emojis').innerHTML=EMOJIS.map(em=>
    `<span class="ep${em===_cmEmoji?' sel':''}" onclick="cmSetEmoji('${em}',this)">${em}</span>`
  ).join('');
  document.getElementById('cm-palette').innerHTML=COLORS.map((c,i)=>
    `<div class="swatch${i===_cmColorIdx?' sel':''}" style="background:${c.bar}" title="${c.name}" onclick="cmSetColor(${i},this)"></div>`
  ).join('');
  updatePreview();
  document.getElementById('cat-modal').classList.add('open');
  setTimeout(()=>document.getElementById('cm-name').focus(),50);
}
function closeCatModal(){ document.getElementById('cat-modal').classList.remove('open'); }

function cmSetEmoji(em,el){
  _cmEmoji=em;
  document.querySelectorAll('.ep').forEach(x=>x.classList.remove('sel'));
  el.classList.add('sel');
  updatePreview();
}
function cmSetColor(i,el){
  _cmColorIdx=i;
  document.querySelectorAll('.swatch').forEach(x=>x.classList.remove('sel'));
  el.classList.add('sel');
  updatePreview();
}
function updatePreview(){
  const name=document.getElementById('cm-name').value||'Categoría';
  const c=COLORS[_cmColorIdx];
  document.getElementById('prev-icon').style.background=c.bg;
  document.getElementById('prev-icon').textContent=_cmEmoji;
  document.getElementById('prev-name').textContent=name;
  document.getElementById('prev-badge').style.background=c.bg;
  document.getElementById('prev-badge').style.color=c.text;
  document.getElementById('prev-badge').textContent=_cmEmoji+' '+name;
}

/* ══════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════ */
document.getElementById('exp-modal').addEventListener('click',e=>{if(e.target===e.currentTarget)closeExpModal();});
document.getElementById('cat-modal').addEventListener('click',e=>{if(e.target===e.currentTarget)closeCatModal();});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeExpModal();closeCatModal();}
  if(e.key==='n'&&!e.target.matches('input,select,textarea')) openExpModal(null);
});
document.getElementById('login-pass')?.addEventListener('keydown', e=>{ if(e.key==='Enter') doLogin(); });
document.getElementById('login-email')?.addEventListener('keydown', e=>{ if(e.key==='Enter') doLogin(); });
document.getElementById('reg-pass2')?.addEventListener('keydown', e=>{ if(e.key==='Enter') doRegister(); });

const savedTheme=localStorage.getItem('gastos_theme');
if(savedTheme==='dark'){
  document.documentElement.setAttribute('data-theme','dark');
  const tl=document.getElementById('theme-label');
  if(tl) tl.textContent='Modo claro';
}

// Siempre mostrar pantalla de login al cargar
showAuth();

sb.auth.onAuthStateChange((event, session) => {
  if(event === 'SIGNED_IN'){
    currentUser = session.user;
    showApp();
    loadAllData();
  }
  if(event === 'SIGNED_OUT'){
    currentUser = null;
    showAuth();
  }
});
