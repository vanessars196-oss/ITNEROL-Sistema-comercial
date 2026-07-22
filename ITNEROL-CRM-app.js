/* ══════════════════════════════════════════════════
   ITNEROL — app.js
   Lógica completa do CRM (estática, offline, sem backend)
   ══════════════════════════════════════════════════ */
'use strict';

/* ─── Storage ──────────────────────────────────── */
const DB_KEY = 'itnerol_db_v1';
const tabs = ['clientes','veiculos','motoristas','contratos','linhas','apuracao','prospeccoes','propostas','reclamacoes'];

/* Coletar snapshot do data.js shipped com o app */
function buildSeed(){
  if(!window.BACKUP_DATA) return {clientes:[],veiculos:[],motoristas:[],contratos:[],linhas:[],apuracao:[],prospeccoes:[],propostas:[],reclamacoes:[],usuarios:[]};
  const b = window.BACKUP_DATA;
  return {
    clientes:b.clientes||[], veiculos:b.veiculos||[], motoristas:b.motoristas||[],
    contratos:b.contratos||[], linhas:b.linhas||[], apuracao:b.apuracao||[],
    prospeccoes:b.prospeccoes||[], propostas:b.propostas||[], reclamacoes:b.reclamacoes||[],
    usuarios:b.usuarios||[]
  };
}

let DB = {versao:'7.4', sistema:'ITNEROL Sistema Comercial', data_backup:new Date().toISOString(), dados: buildSeed(), config:{}};

function loadDB(){
  try{
    const ls = localStorage.getItem(DB_KEY);
    if(ls){
      const parsed = JSON.parse(ls);
      // Manter dados do usuário se existir; senão usar seed
      if(parsed && parsed.dados && parsed.dados.usuarios && parsed.dados.usuarios.length){
        DB = parsed;
      }
    }
  }catch(e){ console.warn('localStorage load falhou', e); }
}
function saveDB(){
  try{ localStorage.setItem(DB_KEY, JSON.stringify(DB)); }
  catch(e){ toast('Erro ao salvar','error'); }
}

/* IDs estáveis — necessários para FKs */
function ensureIds(){
  // Mapear índices seed → IDs determinísticos por (cliente_id etc.)
  const seed = buildSeed();
  const idKeys = {
    clientes: c => c.id || `cli-${String(seed.clientes.indexOf(c)+1).padStart(3,'0')}`,
    veiculos: v => v.id || `vei-${String(seed.veiculos.indexOf(v)+1).padStart(3,'0')}`,
    motoristas: m => m.id || `mot-${String(seed.motoristas.indexOf(m)+1).padStart(3,'0')}`
  };
  for(const tab of ['clientes','veiculos','motoristas']){
    (DB.dados[tab]||[]).forEach((r,i) => { if(!r.id) r.id = idKeys[tab](r); });
  }
}
loadDB();
ensureIds();
saveDB();

/* ─── Helpers ─────────────────────────────────── */
function esc(s){return (s==null?'':String(s)).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);}
function fmt(n){if(n==null||n==='') return '—'; const v=Number(n); if(isNaN(v)) return n; return v.toLocaleString('pt-BR');}
function fmtR(n){if(n==null||n==='') return '—'; const v=Number(n); if(isNaN(v)) return n; return 'R$ '+v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}
function set(id,v){const e=document.getElementById(id); if(e) e.textContent=v;}
function uid(){ return 'r-'+Date.now()+'-'+Math.random().toString(36).slice(2,8); }
function nowISO(){return new Date().toISOString();}

const COR = {'Ativo':'green','Ativa':'green','Aberta':'red','Em Andamento':'orange','Em Negociação':'orange','Convertida':'green','Perdida':'gray','Resolvida':'green','Aprovada':'green','Recusada':'red','Expirada':'gray','Em Contato':'blue','Reunião Agendada':'purple','Proposta Enviada':'orange','Em Elaboração':'gray','Nova':'gray','Cancelada':'red','Suspenso':'orange','Encerrado':'gray','Em Renovação':'orange','Inativo':'gray','Férias':'blue','Afastado':'orange','Disponível':'green','Em Uso':'orange','Manutenção':'red'};
function badgeStatus(s){const c=(s||'Sem status'); const cls=COR[c]||'gray'; return `<span class="badge badge-${cls}">${esc(c)}</span>`;}

function clienteNome(id){const c=(DB.dados.clientes||[]).find(x=>x.id===id); return c?(c.nome_fantasia||c.razao_social):'—'; }
function veiculoPlaca(id){const v=(DB.dados.veiculos||[]).find(x=>x.id===id); return v?(v.placa+' / '+(v.numero_frota||'—')):'—'; }
function motoristaNome(id){const m=(DB.dados.motoristas||[]).find(x=>x.id===id); return m?m.nome:'—'; }

function mesAtualFmt(){const d=new Date();return String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();}
function ultimosMeses(n){const r=[]; const d=new Date(); for(let i=n-1;i>=0;i--){const m=new Date(d.getFullYear(),d.getMonth()-i,1); r.push(String(m.getMonth()+1).padStart(2,'0')+'/'+m.getFullYear());} return r;}
function parseMes(m){if(!m||!m.includes('/')) return null; const [mm,yy]=m.split('/').map(Number); return new Date(yy,mm-1,1);}

/* ─── Auth ────────────────────────────────────── */
let session=null;
function fazerLogin(e){
  e.preventDefault();
  const email=(document.getElementById('login-email').value||'').trim().toLowerCase();
  const senha=document.getElementById('login-senha').value;
  const u=(DB.dados.usuarios||[]).find(x=>(x.email||'').toLowerCase()===email && x.senha_hash===senha);
  if(!u){const m=el('login-msg'); m.style.display='block'; m.textContent='E-mail ou senha inválidos.'; return false;}
  session={nome:u.nome,email:u.email,perfil:u.perfil};
  sessionStorage.setItem('crm_user',JSON.stringify(session));
  iniciarApp();
  return false;
}
function fazerLogout(){
  if(!confirm('Sair do sistema?')) return;
  sessionStorage.removeItem('crm_user');
  session=null;
  el('app').style.display='none';
  document.body.classList.remove('app-mode');
  el('login-screen').style.display='flex';
  el('login-email').value=''; el('login-senha').value='';
}
function el(id){return document.getElementById(id);}
function perfilLabel(p){return {admin:'Admin',comercial:'Comercial',operacional:'Operacional',visualizador:'Visualizador'}[p]||p;}

function iniciarApp(){
  el('login-screen').style.display='none';
  el('app').style.display='block';
  document.body.classList.add('app-mode');
  const ini=(session.nome||'?').split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase();
  set('sidebar-user-nome', session.nome);
  set('sidebar-user-perfil', perfilLabel(session.perfil));
  set('user-avatar-initials', ini);
  set('chip-avatar', ini);
  set('chip-nome', session.nome.split(' ')[0]);
  set('chip-perfil', perfilLabel(session.perfil));
  aplicarPermissoes();
  atualizarData();
  document.querySelectorAll('.nav-item').forEach(it=>{
    it.onclick=()=>navegar(it.dataset.page);
  });
  // restore last page
  const last=sessionStorage.getItem('crm_page')||'dashboard';
  navegar(last);
}
function aplicarPermissoes(){
  const p=session.perfil;
  document.querySelectorAll('[data-perm]').forEach(el2=>{
    const lista=(el2.dataset.perm||'').split(',');
    if(!lista.includes(p)) el2.classList.add('nav-hidden'); else el2.classList.remove('nav-hidden');
  });
  if(p==='visualizador'){
    const b=el('btn-novo-global'); if(b) b.style.display='none';
  } else {
    const b=el('btn-novo-global'); if(b) b.style.display='flex';
  }
}
function atualizarData(){
  const d=new Date();
  set('topbar-date', d.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}));
  set('topbar-date-big', d.toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'}));
}

const labels={dashboard:'Dashboard',indicadores:'Indicadores',prospeccoes:'Prospecções',propostas:'Propostas',clientes:'Clientes',veiculos:'Veículos',motoristas:'Motoristas',contratos:'Contratos',linhas:'Linhas / Itinerários',reclamacoes:'Reclamações',apuracao:'Apuração Mensal',precificacao:'Precificação',relatorios:'Relatórios / Backup',usuarios:'Usuários'};

function navegar(page){
  document.querySelectorAll('.page').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(i=>i.classList.remove('active'));
  const sec=el('page-'+page); if(sec) sec.classList.add('active');
  const nav=document.querySelector('.nav-item[data-page="'+page+'"]');
  if(nav) nav.classList.add('active');
  set('breadcrumb', labels[page]||page);
  if(renders[page]) renders[page]();
  const semNovo=['dashboard','indicadores','precificacao','relatorios'];
  const b=el('btn-novo-global'); if(b) b.style.display=semNovo.includes(page) ? 'none':'inline-flex';
  sessionStorage.setItem('crm_page', page);
}

/* ─── Renders ─────────────────────────────────── */
const renders={};

renders.dashboard = function(){
  const mes=mesAtualFmt();
  const prosp=DB.dados.prospeccoes.filter(x=>x.mes_ano===mes);
  const prop =DB.dados.propostas.filter(x=>x.mes_ano===mes);
  const fech =prop.filter(x=>x.status==='Aprovada');
  const recl =DB.dados.reclamacoes.filter(x=>['Aberta','Em Andamento'].includes(x.status));
  set('kpi-prospeccoes', prosp.length);
  set('kpi-propostas',   prop.length);
  set('kpi-fechados',    fech.length);
  set('kpi-reclamacoes', recl.length);
  set('kpi-prospeccoes-sub', DB.dados.prospeccoes.length+' no total');
  set('kpi-propostas-sub',   prop.filter(x=>x.status==='Em Negociação').length+' em negociação');
  set('kpi-fechados-sub',    fmtR(fech.reduce((s,x)=>s+(Number(x.valor_proposto)||0),0)));
  set('kpi-reclamacoes-sub', DB.dados.reclamacoes.length+' registradas no total');
  set('kmi-clientes',  DB.dados.clientes.filter(x=>x.status==='Ativo').length);
  set('kmi-contratos', DB.dados.contratos.filter(x=>x.status==='Ativo').length);
  set('kmi-linhas',    DB.dados.linhas.filter(x=>x.status==='Ativa'||x.status==='Ativo').length);
  set('kmi-veiculos',  DB.dados.veiculos.length);
  const convGeral = DB.dados.propostas.filter(p=>p.status==='Aprovada').length;
  const totProspGeral = DB.dados.prospeccoes.length;
  const conv = totProspGeral? Math.round(convGeral/totProspGeral*100):0;
  set('kmi-conversao', conv+'%');
  const hh=new Date().getHours();
  const sa=hh<12?'Bom dia':hh<18?'Boa tarde':'Boa noite';
  set('dash-saudacao', sa+', '+session.nome.split(' ')[0]+'!');
  set('dash-subtitulo', 'Visão geral ITNEROL — '+mes);
  drawCharts();
  renderReclDash();
};

function renderReclDash(){
  const c=el('lista-reclamacoes-dash'); if(!c) return;
  const lista=DB.dados.reclamacoes.filter(r=>['Aberta','Em Andamento'].includes(r.status)).slice(0,8);
  if(!lista.length){ c.innerHTML='<div class="empty-state"><i class="fas fa-check-circle"></i><p>Nenhuma reclamação pendente</p></div>'; return; }
  c.innerHTML=lista.map(r=>`<div style="padding:9px 0;border-bottom:1px solid var(--border)"><div style="font-weight:600;font-size:.84rem">${esc(r.tipo)} — ${esc(clienteNome(r.cliente_id))}</div><div style="font-size:.7rem;color:var(--text-muted)">${esc(r.data||'—')} · ${badgeStatus(r.status)}</div></div>`).join('');
}

let chartsCache={};
function destroyChart(id){if(chartsCache[id]){chartsCache[id].destroy(); delete chartsCache[id];}}
function drawCharts(){
  const ctx=el('chart-faturamento'); if(ctx){destroyChart('chart-faturamento');const meses=ultimosMeses(6);const fat=meses.map(m=>DB.dados.apuracao.filter(a=>a.mes_ano===m).reduce((s,a)=>s+(Number(a.faturamento_realizado)||0),0));const cus=meses.map(m=>DB.dados.apuracao.filter(a=>a.mes_ano===m).reduce((s,a)=>s+(Number(a.custo_total)||0),0));const mar=fat.map((f,i)=>f-cus[i]);chartsCache['chart-faturamento']=new Chart(ctx,{type:'bar',data:{labels:meses,datasets:[{label:'Faturamento',data:fat,backgroundColor:'rgba(240,120,0,.85)',borderRadius:6},{label:'Custo',data:cus,backgroundColor:'rgba(100,116,139,.4)',borderRadius:6},{label:'Margem',data:mar,type:'line',borderColor:'#2E7D32',backgroundColor:'rgba(46,125,50,.08)',tension:.4,fill:false,pointRadius:5,borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{font:{size:10}}}},scales:{y:{ticks:{callback:v=>'R$ '+Math.round(v/1000)+'k'}}}}})}
  const ctx2=el('chart-funil'); if(ctx2){destroyChart('chart-funil');const mes=mesAtualFmt();const prosp=DB.dados.prospeccoes.filter(p=>p.mes_ano===mes).length;const props=DB.dados.propostas.filter(p=>p.mes_ano===mes).length;const neg=DB.dados.propostas.filter(p=>p.mes_ano===mes&&p.status==='Em Negociação').length;const fech=DB.dados.propostas.filter(p=>p.mes_ano===mes&&p.status==='Aprovada').length;const perd=DB.dados.propostas.filter(p=>p.mes_ano===mes&&['Recusada','Expirada'].includes(p.status)).length;chartsCache['chart-funil']=new Chart(ctx2,{type:'bar',data:{labels:['Prospecções','Propostas','Negociação','Fechados','Perdidos'],datasets:[{data:[prosp,props,neg,fech,perd],backgroundColor:['rgba(240,120,0,.85)','rgba(21,101,192,.85)','rgba(249,168,37,.85)','rgba(46,125,50,.85)','rgba(198,40,40,.7)'],borderRadius:8}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{stepSize:1}}}}})}
  const ctx3=el('chart-km'); if(ctx3){destroyChart('chart-km');const meses=ultimosMeses(6);const kmC=meses.map(m=>DB.dados.apuracao.filter(a=>a.mes_ano===m).reduce((s,a)=>s+(Number(a.km_contratada)||0),0));const kmR=meses.map(m=>DB.dados.apuracao.filter(a=>a.mes_ano===m).reduce((s,a)=>s+(Number(a.km_rodada)||0),0));chartsCache['chart-km']=new Chart(ctx3,{type:'bar',data:{labels:meses,datasets:[{label:'KM Cont.',data:kmC,backgroundColor:'rgba(100,116,139,.4)',borderRadius:4},{label:'KM Rod.',data:kmR,backgroundColor:'rgba(240,120,0,.85)',borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{font:{size:10}}}}}})}
  const ctx4=el('chart-veiculos'); if(ctx4){destroyChart('chart-veiculos');const t={};DB.dados.veiculos.forEach(v=>{if(v.tipo)t[v.tipo]=(t[v.tipo]||0)+1;});const labels=Object.keys(t);const vals=Object.values(t);if(!labels.length){chartsCache['chart-veiculos']=new Chart(ctx4,{type:'doughnut',data:{labels:['Sem dados'],datasets:[{data:[1],backgroundColor:['#e2e8f0']}]},options:{responsive:true,maintainAspectRatio:false,cutout:'65%'}});return;}chartsCache['chart-veiculos']=new Chart(ctx4,{type:'doughnut',data:{labels:labels.map((l,i)=>`${l} (${vals[i]})`),datasets:[{data:vals,backgroundColor:['#F07800','#1565C0','#2E7D32','#C62828','#F9A825','#7B1FA2'],borderWidth:2,borderColor:'#fff'}]},options:{responsive:true,maintainAspectRatio:false,cutout:'60%',plugins:{legend:{position:'bottom'}}}})}}
}

renders.indicadores = function(){
  const prosp=DB.dados.prospeccoes.length;
  const props=DB.dados.propostas.length;
  const neg=DB.dados.propostas.filter(p=>p.status==='Em Negociação').length;
  const fech=DB.dados.propostas.filter(p=>p.status==='Aprovada').length;
  const perd=DB.dados.propostas.filter(p=>['Recusada','Expirada'].includes(p.status)).length;
  set('ind-prosp-total', prosp); set('ind-prop-total', props); set('ind-neg-total', neg); set('ind-fecha-total', fech); set('ind-perd-total', perd);
  set('ind-taxa-conversao', prosp?Math.round(fech/prosp*100)+'%':'0%');
  set('ind-ticket-medio', fech.length? fmtR(fech.reduce((s,p)=>s+(Number(p.valor_proposto)||0),0)/fech.length):'R$ 0');
  set('ind-receita-nova', fmtR(fech.reduce((s,p)=>s+(Number(p.valor_proposto)||0),0)));
  set('ind-ciclo','— dias');
  // top responsável
  const r={};
  DB.dados.propostas.filter(p=>p.status==='Aprovada').forEach(p=>{r[p.responsavel||'—']=(r[p.responsavel||'—']||0)+1;});
  const top=Object.entries(r).sort((a,b)=>b[1]-a[1])[0];
  set('ind-resp-lider', top?top[0]:'—');
};

renders.prospeccoes = function(){
  const busca=(el('busca-prosp').value||'').toLowerCase();
  const tb=el('tbody-prosp');
  const lista=DB.dados.prospeccoes.filter(p=>{const t=(p.empresa+' '+p.contato_nome+' '+p.cidade+' '+p.origem+' '+p.responsavel).toLowerCase();return !busca||t.includes(busca);}).sort((a,b)=>(b.data||'').localeCompare(a.data||''));
  if(!lista.length){tb.innerHTML='<tr><td colspan="8"><div class="empty-state"><i class="fas fa-search"></i><p>Nenhuma prospecção</p></div></td></tr>';return;}
  tb.innerHTML=lista.map(p=>`<tr><td><div style="font-weight:600">${esc(p.empresa)}</div><div style="font-size:.7rem;color:var(--text-muted)">${esc(p.contato_email||'')}</div></td><td>${esc(p.contato_nome||'—')}<div style="font-size:.7rem;color:var(--text-muted)">${esc(p.contato_telefone||'')}</div></td><td>${esc(p.cidade||'—')}</td><td><span class="badge badge-blue">${esc(p.origem||'—')}</span></td><td>${esc(p.mes_ano||'—')}</td><td>${esc(p.responsavel||'—')}</td><td>${badgeStatus(p.status)}</td><td class="td-actions"><button class="btn-icon" onclick="abrirModal('prospeccao','${p.id}')"><i class="fas fa-edit"></i></button><button class="btn-icon danger" onclick="excluir('prospeccoes','${p.id}','prospeccao')"><i class="fas fa-trash"></i></button></td></tr>`).join('');
};

renders.propostas = function(){
  const tb=el('tbody-prop');
  if(!DB.dados.propostas.length){tb.innerHTML='<tr><td colspan="9"><div class="empty-state"><i class="fas fa-file-contract"></i><p>Nenhuma proposta</p></div></td></tr>';return;}
  tb.innerHTML=DB.dados.propostas.slice().sort((a,b)=>(b.data_envio||'').localeCompare(a.data_envio||'')).map(p=>{const emp=p.cliente_id?clienteNome(p.cliente_id):(p.empresa||'—');return `<tr><td style="font-weight:700;color:var(--laranja)">${esc(p.numero_proposta||'—')}</td><td>${esc(emp)}</td><td><span class="badge badge-blue">${esc(p.tipo_servico||'—')}</span></td><td>${p.valor_proposto?fmtR(p.valor_proposto):'—'}</td><td style="text-align:center">${esc(p.qtd_veiculos||'—')}</td><td>${esc(p.data_envio||'—')}</td><td>${esc(p.responsavel||'—')}</td><td>${badgeStatus(p.status)}</td><td class="td-actions"><button class="btn-icon" onclick="abrirModal('proposta','${p.id}')"><i class="fas fa-edit"></i></button><button class="btn-icon danger" onclick="excluir('propostas','${p.id}','proposta')"><i class="fas fa-trash"></i></button></td></tr>`;}).join('');
};

renders.clientes = function(){
  const tb=el('tbody-cli');
  const busca=(el('busca-cli').value||'').toLowerCase();
  const lista=DB.dados.clientes.filter(c=>{const t=(c.razao_social+' '+c.nome_fantasia+' '+c.cnpj+' '+c.cidade+' '+c.contato_nome).toLowerCase();return !busca||t.includes(busca);}).sort((a,b)=>(a.nome_fantasia||a.razao_social).localeCompare(b.nome_fantasia||b.razao_social));
  if(!lista.length){tb.innerHTML='<tr><td colspan="6"><div class="empty-state"><i class="fas fa-building"></i><p>Nenhum cliente</p></div></td></tr>';return;}
  tb.innerHTML=lista.map(c=>`<tr><td><div style="font-weight:700">${esc(c.razao_social||'—')}</div><div style="font-size:.7rem;color:var(--text-muted)">${esc(c.nome_fantasia||'')} · ${esc(c.segmento||'')}</div></td><td class="td-num">${esc(c.cnpj||'—')}</td><td>${esc(c.contato_nome||'—')}<div style="font-size:.7rem;color:var(--text-muted)">${esc(c.contato_telefone||'')}</div></td><td>${esc(c.cidade||'—')}</td><td>${badgeStatus(c.status)}</td><td class="td-actions"><button class="btn-icon" onclick="abrirModal('cliente','${c.id}')"><i class="fas fa-edit"></i></button><button class="btn-icon danger" onclick="excluir('clientes','${c.id}','cliente')"><i class="fas fa-trash"></i></button></td></tr>`).join('');
};

renders.veiculos = function(){
  const cont=el('frota-cards');
  const busca=(el('busca-vei').value||'').toLowerCase();
  const lista=DB.dados.veiculos.filter(v=>{const t=(v.placa+' '+v.numero_frota+' '+v.modelo+' '+(v.tipo||'')).toLowerCase();return !busca||t.includes(busca);}).sort((a,b)=>(a.placa||'').localeCompare(b.placa||''));
  if(!lista.length){cont.innerHTML='<div class="empty-state"><i class="fas fa-truck"></i><p>Nenhum veículo</p></div>';return;}
  cont.innerHTML=lista.map(v=>`<div class="veiculo-card"><span class="veiculo-tipo-badge">${esc(v.tipo||'N/D')}</span><div class="veiculo-num">Frota ${esc(v.numero_frota||'—')}</div><div class="veiculo-placa">${esc(v.placa||'—')}</div><div class="veiculo-modelo">${esc(v.modelo||'—')} ${v.ano?'· '+v.ano:''}</div><div class="veiculo-info-item"><span>Capacidade</span><span>${esc(v.capacidade||'—')} pax</span></div><div class="veiculo-info-item"><span>KM Atual</span><span>${v.km_atual?fmt(v.km_atual):'—'}</span></div><div class="veiculo-info-item"><span>Status</span><span>${badgeStatus(v.status)}</span></div><div style="display:flex;gap:6px;margin-top:12px"><button class="btn-primary btn-sm" onclick="abrirModal('veiculo','${v.id}')"><i class="fas fa-edit"></i> Editar</button><button class="btn-outline btn-sm" onclick="excluir('veiculos','${v.id}','veiculo')"><i class="fas fa-trash"></i></button></div></div>`).join('');
};

renders.motoristas = function(){
  const tb=el('tbody-mot');
  const busca=(el('busca-mot').value||'').toLowerCase();
  const lista=DB.dados.motoristas.filter(m=>(m.nome||'').toLowerCase().includes(busca)).sort((a,b)=>(a.nome||'').localeCompare(b.nome||''));
  if(!lista.length){tb.innerHTML='<tr><td colspan="8"><div class="empty-state"><i class="fas fa-id-card"></i><p>Nenhum motorista</p></div></td></tr>';return;}
  tb.innerHTML=lista.map(m=>{
    let alerta='';
    if(m.vencimento_cnh){const d=Math.floor((new Date(m.vencimento_cnh)-new Date())/86400000); if(d<90) alerta='color:var(--vermelho);font-weight:700';}
    return `<tr><td style="font-weight:600">${esc(m.nome||'—')}</td><td>${esc(m.cpf||'—')}</td><td>${esc(m.cnh||'—')}</td><td><span class="badge badge-blue">${esc(m.categoria_cnh||'—')}</span></td><td style="${alerta}">${esc(m.vencimento_cnh||'—')}</td><td>${esc(m.telefone||'—')}</td><td>${badgeStatus(m.status)}</td><td class="td-actions"><button class="btn-icon" onclick="abrirModal('motorista','${m.id}')"><i class="fas fa-edit"></i></button><button class="btn-icon danger" onclick="excluir('motoristas','${m.id}','motorista')"><i class="fas fa-trash"></i></button></td></tr>`;
  }).join('');
};

renders.contratos = function(){
  const hoje=new Date(); hoje.setHours(0,0,0,0);
  const av=el('alertas-vencimento');
  const criticos=[];
  DB.dados.contratos.forEach(ct=>{
    if(ct.status==='Ativo' && ct.data_fim){
      const f=new Date(ct.data_fim+'T00:00:00');
      const dias=Math.floor((f-hoje)/86400000);
      if(dias>=0 && dias<=60) criticos.push({...ct,dias});
    }
  });
  if(criticos.length){av.innerHTML=`<div class="alerta-banner alerta-critico"><i class="fas fa-exclamation-triangle"></i><div><strong>${criticos.length} contrato(s) vencendo em até 60 dias</strong><div style="font-size:.78rem;margin-top:6px;display:flex;flex-wrap:wrap;gap:8px">${criticos.map(c=>`<span style="background:#fff;border:1px solid var(--vermelho-light);padding:3px 8px;border-radius:5px"><strong>${esc(clienteNome(c.cliente_id))}</strong> · ${esc(c.numero_contrato||'s/ nº')} · ${c.dias} dias</span>`).join('')}</div></div></div>`;} else av.innerHTML='';
  const tb=el('tbody-ct');
  if(!DB.dados.contratos.length){tb.innerHTML='<tr><td colspan="8"><div class="empty-state"><i class="fas fa-file-signature"></i><p>Nenhum contrato</p></div></td></tr>';return;}
  tb.innerHTML=DB.dados.contratos.map(ct=>`<tr><td><div style="font-weight:600">${esc(clienteNome(ct.cliente_id))}</div><div style="font-size:.7rem;color:var(--text-muted)">${esc(ct.numero_contrato||'Sem número')}</div></td><td><span class="badge badge-blue">${esc(ct.tipo_servico||'—')}</span></td><td>${ct.valor_mensal?fmtR(ct.valor_mensal):'—'}</td><td>${ct.km_mensal_contratada?fmt(ct.km_mensal_contratada):'—'}</td><td>${esc(ct.data_inicio||'—')}</td><td>${esc(ct.data_fim||'—')}</td><td>${badgeStatus(ct.status)}</td><td class="td-actions"><button class="btn-icon" onclick="abrirModal('contrato','${ct.id}')"><i class="fas fa-edit"></i></button><button class="btn-icon danger" onclick="excluir('contratos','${ct.id}','contrato')"><i class="fas fa-trash"></i></button></td></tr>`).join('');
};

renders.linhas = function(){
  const busca=(el('busca-linhas').value||'').toLowerCase();
  set('count-linhas', DB.dados.linhas.length);
  const tb=el('tbody-linhas');
  const lista=DB.dados.linhas.filter(l=>{const t=(l.codigo_linha+' '+l.descricao+' '+l.itinerario).toLowerCase();return !busca||t.includes(busca);}).sort((a,b)=>(a.codigo_linha||'').localeCompare(b.codigo_linha||''));
  if(!lista.length){tb.innerHTML='<tr><td colspan="7"><div class="empty-state"><i class="fas fa-route"></i><p>Nenhuma linha</p></div></td></tr>';return;}
  tb.innerHTML=lista.map(l=>`<tr><td style="font-weight:700;color:var(--laranja)">${esc(l.codigo_linha||'—')}</td><td>${esc(clienteNome(l.cliente_id))}</td><td><div style="font-weight:600">${esc(l.descricao||'—')}</div><div style="font-size:.7rem;color:var(--text-muted)">${esc(l.itinerario||'')}</div></td><td><span class="badge badge-blue">${esc(l.tipo_veiculo||'—')}</span></td><td>${l.km_mensal_contratada?fmt(l.km_mensal_contratada):'—'}</td><td>${badgeStatus(l.status)}</td><td class="td-actions"><button class="btn-icon" onclick="abrirModal('linha','${l.id}')"><i class="fas fa-edit"></i></button><button class="btn-icon danger" onclick="excluir('linhas','${l.id}','linha')"><i class="fas fa-trash"></i></button></td></tr>`).join('');
};

renders.reclamacoes = function(){
  const tb=el('tbody-recl');
  if(!DB.dados.reclamacoes.length){tb.innerHTML='<tr><td colspan="7"><div class="empty-state"><i class="fas fa-check-circle" style="color:#22c55e"></i><p>Nenhuma reclamação</p></div></td></tr>';return;}
  tb.innerHTML=DB.dados.reclamacoes.slice().sort((a,b)=>(b.data||'').localeCompare(a.data||'')).map(r=>`<tr><td>${esc(r.data||'—')}</td><td>${esc(clienteNome(r.cliente_id))}</td><td>${esc(r.tipo||'—')}</td><td>${esc(r.motorista_nome||'—')}</td><td>${esc(r.veiculo_escalado||'—')}</td><td>${badgeStatus(r.status)}</td><td class="td-actions"><button class="btn-icon" onclick="abrirModal('reclamacao','${r.id}')"><i class="fas fa-edit"></i></button><button class="btn-icon danger" onclick="excluir('reclamacoes','${r.id}','reclamacao')"><i class="fas fa-trash"></i></button></td></tr>`).join('');
};

renders.apuracao = function(){
  const tb=el('tbody-ap');
  if(!DB.dados.apuracao.length){tb.innerHTML='<tr><td colspan="9"><div class="empty-state"><i class="fas fa-calculator"></i><p>Nenhuma apuração</p></div></td></tr>';return;}
  tb.innerHTML=DB.dados.apuracao.slice().sort((a,b)=>(b.mes_ano||'').localeCompare(a.mes_ano||'')).map(a=>{
    const fatR=Number(a.faturamento_realizado)||0;
    const cus=Number(a.custo_total)||0;
    const margem=cus? (fatR-cus):(Number(a.margem_bruta)||0);
    const pct=fatR? Math.round(margem/fatR*10000)/100:(Number(a.margem_percentual)||0);
    return `<tr><td><strong>${esc(a.mes_ano||'—')}</strong></td><td>${esc(clienteNome(a.cliente_id))}</td><td>${fmt(a.km_contratada)}</td><td>${fmt(a.km_rodada)}</td><td>${fmtR(a.faturamento_contrato)}</td><td>${fmtR(a.faturamento_realizado)}</td><td>${fmtR(a.custo_total)}</td><td style="color:${margem<0?'var(--vermelho)':'var(--verde)'};font-weight:700">${fmtR(margem)}</td><td><span class="badge ${pct<0?'badge-red':'badge-green'}">${(typeof pct==='number'? pct.toFixed(2):pct)}%</span></td></tr>`;
  }).join('');
};

renders.relatorios = function(){
  set('rc-cli', DB.dados.clientes.length); set('rc-vei', DB.dados.veiculos.length);
  set('rc-mot', DB.dados.motoristas.length); set('rc-ct', DB.dados.contratos.length);
  set('rc-li', DB.dados.linhas.length); set('rc-ap', DB.dados.apuracao.length);
  set('rc-pr', DB.dados.prospeccoes.length); set('rc-po', DB.dados.propostas.length);
  set('rc-re', DB.dados.reclamacoes.length);
};

renders.usuarios = function(){
  const tb=el('tbody-usu');
  tb.innerHTML=(DB.dados.usuarios||[]).map(u=>`<tr><td>${esc(u.nome)}</td><td>${esc(u.email)}</td><td><span class="badge badge-purple">${esc(perfilLabel(u.perfil))}</span></td><td><span class="badge badge-green">Ativo</span></td></tr>`).join('');
};

/* ─── Modal ──────────────────────────────────── */
let modalTipo=null, modalItem=null, modalAcao=null;
function abrirModal(tipo, id){
  const valid=['cliente','veiculo','motorista','contrato','prospeccao','proposta','reclamacao','linha'];
  if(valid.indexOf(tipo)<0) return;
  if(session.perfil==='visualizador'){toast('Visualizador não pode editar','warning'); return;}
  modalTipo=tipo; modalItem=null;
  const tab=tipo+'s';
  if(tab==='linhas') var tabReal='linhas'; else var tabReal=tab;
  const arr=DB.dados[tabReal]||[];
  if(id){
    modalItem=arr.find(x=>x.id===id);
    if(!modalItem){toast('Registro não encontrado','error');return;}
    modalAcao='editar';
  } else {
    modalItem={id:uid()};
    modalAcao='criar';
  }
  const titulos={cliente:'Cliente',veiculo:'Veículo',motorista:'Motorista',contrato:'Contrato',prospeccao:'Prospecção',proposta:'Proposta',reclamacao:'Reclamação',linha:'Linha'};
  set('modal-titulo', (modalAcao==='editar'?'Editar ':'Nova ')+titulos[tipo]);
  el('modal-box').className='modal'+(tipo==='prospeccao'||tipo==='linha'?' modal-lg':'');
  el('modal-body').innerHTML=gerarForm(tipo, modalItem);
  el('modal-overlay').classList.add('open');
}
function fecharModal(){el('modal-overlay').classList.remove('open'); modalTipo=null; modalItem=null;}

function sg(k,lab,type='text'){return `<div class="form-group"><label>${lab}</label><input type="${type}" id="f-${k}" value="${esc(modalItem[k]||'')}"/></div>`;}
function sgOpt(k,lab,opts){return `<div class="form-group"><label>${lab}</label><select id="f-${k}">${opts.map(o=>`<option ${(modalItem[k]||'')==o?'selected':''} value="${esc(o)}">${esc(o)}</option>`).join('')}</select></div>`;}
function sgTxt(k,lab,rows=2){return `<div class="form-group"><label>${lab}</label><textarea id="f-${k}" rows="${rows}">${esc(modalItem[k]||'')}</textarea></div>`;}
function sgCli(k,lab){const opts=DB.dados.clientes.map(c=>`<option ${modalItem[k]===c.id?'selected':''} value="${c.id}">${esc(c.nome_fantasia||c.razao_social)}</option>`).join('');return `<div class="form-group"><label>${lab}</label><select id="f-${k}"><option value="">— Selecione —</option>${opts}</select></div>`;}
function sgCliOpt(k,lab){const opts=DB.dados.clientes.map(c=>`<option ${modalItem[k]===c.id?'selected':''} value="${c.id}">${esc(c.nome_fantasia||c.razao_social)}</option>`).join('');return `<div class="form-group"><label>${lab}</label><select id="f-${k}"><option value="">— Nenhum —</option>${opts}</select></div>`;}

function gerarForm(tipo,r){
  if(tipo==='cliente'){
    return `<div class="form-row">${sg('razao_social','Razão Social')}${sg('nome_fantasia','Nome Fantasia')}</div>
      <div class="form-row">${sg('cnpj','CNPJ')}${sg('segmento','Segmento')}</div>
      <div class="form-row">${sg('contato_nome','Contato')}${sg('contato_cargo','Cargo')}</div>
      <div class="form-row">${sg('contato_email','E-mail','email')}${sg('contato_telefone','Telefone')}</div>
      <div class="form-row">${sg('endereco','Endereço')}${sg('cidade','Cidade')}</div>
      <div class="form-row">${sgOpt('status','Status',['Ativo','Inativo','Suspenso'])}${sg('data_inicio','Início','date')}</div>
      ${sgTxt('observacoes','Observações')}`;
  }
  if(tipo==='veiculo'){
    return `<div class="form-row">${sg('placa','Placa')}${sg('numero_frota','Nº Frota')}</div>
      <div class="form-row">${sgOpt('tipo','Tipo',['Ônibus','Microônibus','Van','Sedan Executivo','SUV'])}${sg('modelo','Modelo')}</div>
      <div class="form-row">${sg('ano','Ano')}${sg('capacidade','Capacidade')}</div>
      <div class="form-row">${sg('km_atual','KM Atual','number')}${sgOpt('status','Status',['Disponível','Em Uso','Manutenção','Inativo'])}</div>
      ${sgTxt('observacoes','Observações')}`;
  }
  if(tipo==='motorista'){
    return `<div class="form-row">${sg('nome','Nome')}${sg('cpf','CPF')}</div>
      <div class="form-row">${sg('cnh','CNH')}${sgOpt('categoria_cnh','Categoria CNH',['A','B','C','D','E','AB','AC','AD','AE'])}</div>
      <div class="form-row">${sg('vencimento_cnh','Vencimento CNH','date')}${sg('telefone','Telefone')}</div>
      <div class="form-row">${sg('salario_base','Salário Base','number')}${sgOpt('status','Status',['Ativo','Férias','Afastado','Inativo'])}</div>
      ${sg('endereco','Endereço')}
      <div class="form-row">${sg('cidade_motorista','Cidade')}${sgOpt('categoria_veiculo','Habilitado Para',['Ônibus','Microônibus','Van','Sedan Executivo','SUV'])}</div>`;
  }
  if(tipo==='contrato'){
    return `${sgCli('cliente_id','Cliente')}
      <div class="form-row">${sg('numero_contrato','Nº Contrato')}${sgOpt('tipo_servico','Tipo de Serviço',['Fretamento Corporativo','Transporte Escolar','Excursão','Eventos','Linha Regular'])}</div>
      <div class="form-row">${sg('valor_mensal','Valor Mensal (R$)','number')}${sg('km_mensal_contratada','KM Mensal Contratada','number')}</div>
      <div class="form-row">${sg('data_inicio','Início','date')}${sg('data_fim','Fim','date')}</div>
      <div class="form-row">${sg('onibus_qtd','Qtd Ônibus','number')}${sg('micro_qtd','Qtd Micro','number')}</div>
      <div class="form-row">${sg('van_qtd','Qtd Van','number')}${sg('passeio_qtd','Qtd Passeio','number')}</div>
      <div class="form-row">${sgOpt('status','Status',['Ativo','Suspenso','Encerrado','Em Renovação'])}${sg('prefixos','Prefixos')}</div>
      ${sgTxt('observacoes','Observações')}`;
  }
  if(tipo==='prospeccao'){
    return `<div class="form-row">${sg('empresa','Empresa')}${sg('mes_ano','Mês (MM/AAAA)')}</div>
      <div class="form-row">${sg('contato_nome','Contato')}${sg('contato_telefone','Telefone')}</div>
      <div class="form-row">${sg('contato_email','E-mail','email')}${sg('cidade','Cidade')}</div>
      <div class="form-row">${sg('segmento','Segmento')}${sgOpt('origem','Origem',['Site','Indicação','LinkedIn','Visita','Telefone','WhatsApp','Outro'])}</div>
      <div class="form-row">${sg('responsavel','Responsável')}${sg('data','Data','date')}</div>
      ${sgOpt('status','Status',['Nova','Em Contato','Reunião Agendada','Proposta Enviada','Convertida','Perdida'])}
      ${sgCliOpt('cliente_id','Cliente vinculado')}
      ${sgTxt('observacoes','Observações')}`;
  }
  if(tipo==='proposta'){
    return `<div class="form-row">${sg('numero_proposta','Nº Proposta')}${sg('mes_ano','Mês')}</div>
      <div class="form-row">${sg('empresa','Empresa')}${sg('contato_nome','Contato')}</div>
      ${sgCli('cliente_id','Cliente')}
      <div class="form-row">${sgOpt('tipo_servico','Tipo de Serviço',['Fretamento Corporativo','Transporte Escolar','Excursão','Eventos','Linha Regular'])}${sg('responsavel','Responsável')}</div>
      <div class="form-row">${sg('valor_proposto','Valor Proposto (R$)','number')}${sg('km_mensal','KM Mensal','number')}</div>
      <div class="form-row">${sg('qtd_veiculos','Qtd Veículos','number')}${sgOpt('status','Status',['Em Elaboração','Em Negociação','Aprovada','Recusada','Expirada','Cancelada'])}</div>
      <div class="form-row">${sg('data_envio','Data Envio','date')}${sg('data_validade','Validade','date')}</div>
      ${sgTxt('observacoes','Observações / Motivo Perda')}`;
  }
  if(tipo==='linha'){
    return `${sgCli('cliente_id','Cliente')}
      <div class="form-row">${sg('codigo_linha','Código')}${sg('descricao','Descrição')}</div>
      <div class="form-row">${sg('itinerario','Itinerário')}${sgOpt('tipo_veiculo','Tipo Veículo',['Ônibus','Microônibus','Van','Sedan Executivo','SUV'])}</div>
      <div class="form-row">${sg('endereco_garagem','Endereço Garagem')}${sg('endereco_inicio_linha','Endereço Início Linha')}</div>
      <div class="form-row">${sg('km_diaria','KM/dia','number')}${sg('dias_mes','Dias/mês','number')}</div>
      <div class="form-row">${sg('km_mensal_contratada','KM Mensal Contratada','number')}${sgOpt('status','Status',['Ativa','Inativa','Planejada'])}</div>
      <div class="form-row">${sg('horario_ida','Horário Ida')}${sg('horario_volta','Horário Volta')}</div>
      ${sgTxt('observacoes','Observações')}`;
  }
  if(tipo==='reclamacao'){
    return `<div class="form-row">${sg('data','Data','date')}${sgOpt('tipo','Tipo',['Conduta do Motorista','Atraso','Veículo','Limpeza','Rota','Outro'])}</div>
      ${sgCli('cliente_id','Cliente')}
      <div class="form-row">${sg('motorista_nome','Motorista')}${sg('veiculo_escalado','Veículo')}</div>
      <div class="form-row">${sgOpt('status','Status',['Aberta','Em Andamento','Resolvida','Cancelada'])}${sgOpt('origem_reclamacao','Origem',['E-mail','WhatsApp','Telefone','Presencial'])}</div>
      ${sgTxt('descricao','Descrição',3)}
      ${sgTxt('resolucao','Resolução')}`;
  }
}

function salvarModal(){
  if(!modalTipo || !modalItem) return;
  const tab = (modalTipo==='linha'?'linhas':modalTipo+'s');
  const arr=DB.dados[tab]=DB.dados[tab]||[];
  const novo={};
  // pegar form values
  document.querySelectorAll('#modal-body [id^="f-"]').forEach(el2=>{
    const k=el2.id.slice(2);
    novo[k]=el2.value;
  });
  novo.id=modalItem.id;
  if(arr.length===0) DB.dados[tab]=[novo]; // assign array if missing
  const idx=arr.findIndex(x=>x.id===novo.id);
  if(idx<0) arr.push(novo); else arr[idx]=novo;
  saveDB();
  toast(modalAcao==='criar'?'✅ Registro criado':'✅ Atualizado','success');
  fecharModal();
  const map={'cliente':'clientes','veiculo':'veiculos','motorista':'motoristas','contrato':'contratos','prospeccao':'prospeccoes','proposta':'propostas','reclamacao':'reclamacoes','linha':'linhas'};
  if(renders[map[modalTipo]]) renders[map[modalTipo]]();
}

function excluir(tab,id,tipo){
  if(!confirm('Excluir este registro? Esta ação não pode ser desfeita.')) return;
  DB.dados[tab]=(DB.dados[tab]||[]).filter(x=>x.id!==id);
  saveDB();
  toast('🗑️ Excluído','info');
  const map={'clientes':'clientes','veiculos':'veiculos','motoristas':'motoristas','contratos':'contratos','prospeccoes':'prospeccoes','propostas':'propostas','reclamacoes':'reclamacoes','linhas':'linhas'};
  if(renders[map[tab]]) renders[map[tab]]();
  renders.dashboard();
}

function abrirNovoContextual(){
  const map={clientes:'cliente',veiculos:'veiculo',motoristas:'motorista',contratos:'contrato',prospeccoes:'prospeccao',propostas:'proposta',reclamacoes:'reclamacao'};
  for(const [tab,tipo] of Object.entries(map)){
    if(el('page-'+tipo) && el('page-'+tipo).classList.contains('active')){
      abrirModal(tipo); return;
    }
  }
  abrirModal('cliente');
}

/* ─── CSV / JSON ────────────────────────────── */
function exportarCSV(tab){
  const arr=DB.dados[tab]||[];
  if(!arr.length){toast('Nada para exportar','warning');return;}
  const keys=Array.from(new Set(arr.reduce((acc,r)=>acc.concat(Object.keys(r)),[])));
  const csv=[keys.join(';')].concat(arr.map(r=>keys.map(k=>`"${(r[k]==null?'':String(r[k])).replace(/"/g,'""')}"`).join(';'))).join('\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=`itnerol_${tab}_${Date.now()}.csv`; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast('CSV de '+tab+' exportado','success');
}
function exportarBackup(){
  const snapshot={versao:DB.versao,sistema:DB.sistema,data_backup:new Date().toISOString(),dados:DB.dados,totais:{
    clientes:DB.dados.clientes.length, veiculos:DB.dados.veiculos.length, motoristas:DB.dados.motoristas.length,
    contratos:DB.dados.contratos.length, linhas:DB.dados.linhas.length, apuracao:DB.dados.apuracao.length,
    prospeccoes:DB.dados.prospeccoes.length, propostas:DB.dados.propostas.length, reclamacoes:DB.dados.reclamacoes.length
  }};
  const blob=new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=`ITNEROL_Backup_${new Date().toISOString().slice(0,10)}.json`; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast('Backup JSON exportado','success');
}
function importarBackup(ev){
  const f=ev.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=e=>{
    try{
      const raw=JSON.parse(e.target.result);
      if(!raw.dados){toast('Arquivo inválido','error');return;}
      if(confirm('Substituir dados atuais pelos do backup? Cancel = mesclar (manter atuais + adicionar do backup).')){
        DB.dados=raw.dados; saveDB();
        toast('Backup restaurado (substituição)','success',4000);
      } else {
        let added=0;
        for(const tab of ['clientes','veiculos','motoristas','contratos','linhas','apuracao','prospeccoes','propostas','reclamacoes','usuarios']){
          if(raw.dados[tab]){
            DB.dados[tab]=DB.dados[tab]||[];
            const existentes=new Set(DB.dados[tab].map(r=>r.id||JSON.stringify(r).slice(0,80)));
            for(const rec of raw.dados[tab]){
              const chave=rec.id||JSON.stringify(rec).slice(0,80);
              if(!existentes.has(chave)){DB.dados[tab].push(rec); added++;}
            }
          }
        }
        saveDB();
        toast('Backup mesclado: '+added+' registros adicionados','success',4000);
      }
      navegar('relatorios');
    }catch(err){toast('JSON inválido: '+err.message,'error');}
  };
  r.readAsText(f);
}

/* ─── Precificação ──────────────────────────── */
function calcularPrecificacao(){
  const kmDia=Number(el('prec-km-dia').value);
  const dias=Number(el('prec-dias-mes').value);
  const consumo=Number(el('prec-consumo').value);
  const diesel=Number(el('prec-diesel').value);
  const salario=Number(el('prec-salario').value);
  const margem=Number(el('prec-margem').value);
  if(!kmDia||!dias||!consumo||!diesel){toast('Preencha KM/dia, dias, consumo e diesel','warning');return;}
  const kmMes=kmDia*dias;
  const combust=kmMes/consumo*diesel;
  const mot=salario*1.75;
  const outros=1500;
  const subtotal=combust+mot+outros;
  const preco=subtotal*(1+margem/100);
  el('prec-resultado').innerHTML=`<div style="background:linear-gradient(135deg,#FFF3E0,#fff);border-radius:10px;padding:18px;border:1px solid var(--laranja-light)">
    <div style="font-size:.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">KM Mensal calculado</div>
    <div style="font-size:1.7rem;font-weight:800;color:var(--laranja)">${fmt(kmMes)} km/mês</div>
    <div class="form-row" style="margin-top:14px">
      <div><div style="font-size:.7rem;color:var(--text-muted);text-transform:uppercase">⛽ Combustível</div><div style="font-weight:700;font-size:1.05rem">${fmtR(combust)}</div></div>
      <div><div style="font-size:.7rem;color:var(--text-muted);text-transform:uppercase">👤 Motorista</div><div style="font-weight:700;font-size:1.05rem">${fmtR(mot)}</div></div>
      <div><div style="font-size:.7rem;color:var(--text-muted);text-transform:uppercase">🏢 Adm.</div><div style="font-weight:700;font-size:1.05rem">${fmtR(outros)}</div></div>
    </div>
    <div style="margin-top:14px;padding-top:14px;border-top:2px dashed var(--laranja)">
      <div style="font-size:.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">💰 Preço Final (margem ${margem}%)</div>
      <div style="font-size:2.2rem;font-weight:800;color:var(--laranja)">${fmtR(preco)}<span style="font-size:.95rem;color:var(--text-muted);font-weight:500">/mês</span></div>
      <div style="font-size:.78rem;color:var(--text-muted);margin-top:4px">CPK: <strong>${fmtR(preco/kmMes)}</strong>/km</div>
    </div>
  </div>`;
}

/* ─── Toast ──────────────────────────────────── */
function toast(msg,tipo='info',ms=3500){
  const c=el('toast-container');
  const t=document.createElement('div');
  t.className='toast '+(tipo||'');
  t.textContent=msg;
  c.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),300);},ms);
}

/* ─── Online/Offline ────────────────────────── */
function updateNetStatus(){
  const b=el('btn-off');
  if(!b) return;
  if(navigator.onLine){b.className='btn-off online'; b.innerHTML='<i class="fas fa-wifi"></i> Online';}
  else {b.className='btn-off offline'; b.innerHTML='<i class="fas fa-plug"></i> Offline'; toast('Você está offline — usando dados do navegador','warning',3000);}
}
window.addEventListener('online',updateNetStatus);
window.addEventListener('offline',updateNetStatus);

/* ─── Boot ──────────────────────────────────── */
(function boot(){
  // Manter backup em localStorage também como fallback para futuras importações
  updateNetStatus();
  let s=null;
  try{s=JSON.parse(sessionStorage.getItem('crm_user')||'null');}catch(e){}
  if(s){session=s;iniciarApp();}
  el('login-form').addEventListener('submit',fazerLogin);
  // Bootstrap do formulário de login (caso browser autocomplete)
  setTimeout(()=>{try{const e=document.activeElement;if(e&&e.id==='login-email')setTimeout(()=>{},0);}catch(x){}},100);
})();

/* Expor para handlers inline onclick */
window.fazerLogin=fazerLogin;
window.fazerLogout=fazerLogout;
window.abrirNovoContextual=abrirNovoContextual;
window.abrirModal=abrirModal;
window.fecharModal=fecharModal;
window.salvarModal=salvarModal;
window.excluir=excluir;
window.exportarCSV=exportarCSV;
window.exportarBackup=exportarBackup;
window.importarBackup=importarBackup;
window.calcularPrecificacao=calcularPrecificacao;
window.toast=toast;
