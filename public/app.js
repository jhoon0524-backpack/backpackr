'use strict';

// ===== 상수 =====

const STAGES = [
  { key: 'lead', label: '리드' },
  { key: 'contacted', label: '컨택' },
  { key: 'proposal', label: '제안' },
  { key: 'negotiation', label: '협상' },
  { key: 'won', label: '성사' },
  { key: 'lost', label: '실패' },
];
const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.key, s.label]));

const ACTIVITY_TYPES = [
  { key: 'call', label: '통화', icon: '📞' },
  { key: 'meeting', label: '미팅', icon: '🤝' },
  { key: 'email', label: '이메일', icon: '✉️' },
  { key: 'note', label: '메모', icon: '📝' },
];
const ACT_META = Object.fromEntries(ACTIVITY_TYPES.map((a) => [a.key, a]));

const VIEW_TITLES = {
  dashboard: '대시보드',
  pipeline: '파이프라인',
  deals: '딜 목록',
  companies: '고객사',
  contacts: '연락처',
  activities: '활동',
};

// ===== 유틸 =====

const $ = (sel, el = document) => el.querySelector(sel);
const content = $('#content');

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

function money(n) {
  n = Number(n) || 0;
  if (n >= 100000000) {
    const eok = n / 100000000;
    return `${Number.isInteger(eok) ? eok : eok.toFixed(1)}억원`;
  }
  if (n >= 10000) return `${Math.round(n / 10000).toLocaleString()}만원`;
  return `${n.toLocaleString()}원`;
}

function timeAgo(iso) {
  if (!iso) return '';
  const t = new Date(iso.replace(' ', 'T'));
  const diff = (Date.now() - t.getTime()) / 1000;
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  return iso.slice(0, 10);
}

function toast(msg, isError = false) {
  const el = document.createElement('div');
  el.className = 'toast' + (isError ? ' error' : '');
  el.textContent = msg;
  $('#toast-root').appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error || `요청 실패 (${res.status})`;
    toast(msg, true);
    throw new Error(msg);
  }
  return data;
}

// ===== 모달 =====

function openModal({ title, fields, initial = {}, onSubmit, onDelete }) {
  const root = $('#modal-root');
  const fieldHtml = fields
    .map((f) => {
      const val = initial[f.name] ?? f.value ?? '';
      let input;
      if (f.type === 'select') {
        const opts = f.options
          .map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(val) ? 'selected' : ''}>${esc(o.label)}</option>`)
          .join('');
        input = `<select class="input" name="${f.name}">${opts}</select>`;
      } else if (f.type === 'textarea') {
        input = `<textarea class="input" name="${f.name}" rows="3">${esc(val)}</textarea>`;
      } else {
        input = `<input class="input" name="${f.name}" type="${f.type || 'text'}" value="${esc(val)}" ${f.required ? 'required' : ''} placeholder="${esc(f.placeholder || '')}" />`;
      }
      return `<div class="field ${f.full ? 'full' : ''}"><label>${esc(f.label)}${f.required ? ' *' : ''}</label>${input}</div>`;
    })
    .join('');

  root.innerHTML = `
    <div class="modal-backdrop">
      <form class="modal">
        <h2>${esc(title)}</h2>
        <div class="form-grid">${fieldHtml}</div>
        <div class="modal-actions">
          ${onDelete ? '<button type="button" class="btn danger left" data-act="delete">삭제</button>' : ''}
          <button type="button" class="btn" data-act="cancel">취소</button>
          <button type="submit" class="btn primary">저장</button>
        </div>
      </form>
    </div>`;

  const backdrop = $('.modal-backdrop', root);
  const form = $('form', root);
  const close = () => (root.innerHTML = '');

  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  $('[data-act="cancel"]', form).addEventListener('click', close);
  if (onDelete) {
    $('[data-act="delete"]', form).addEventListener('click', async () => {
      if (!confirm('정말 삭제할까요?')) return;
      await onDelete();
      close();
    });
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {};
    for (const f of fields) body[f.name] = form.elements[f.name].value;
    await onSubmit(body);
    close();
  });
  const first = form.querySelector('.input');
  if (first) first.focus();
}

// ===== 폼 필드 정의 =====

async function companyOptions(includeEmpty = true) {
  const companies = await api('/api/companies');
  const opts = companies.map((c) => ({ value: c.id, label: c.name }));
  return includeEmpty ? [{ value: '', label: '(없음)' }, ...opts] : opts;
}

async function contactOptions() {
  const contacts = await api('/api/contacts');
  return [
    { value: '', label: '(없음)' },
    ...contacts.map((c) => ({ value: c.id, label: c.company_name ? `${c.name} (${c.company_name})` : c.name })),
  ];
}

function companyFields() {
  return [
    { name: 'name', label: '고객사명', required: true, full: true },
    { name: 'industry', label: '업종' },
    { name: 'phone', label: '대표 전화' },
    { name: 'website', label: '웹사이트', full: true, placeholder: 'https://' },
    { name: 'memo', label: '메모', type: 'textarea', full: true },
  ];
}

async function contactFields() {
  return [
    { name: 'name', label: '이름', required: true },
    { name: 'title', label: '직함' },
    { name: 'company_id', label: '고객사', type: 'select', options: await companyOptions(), full: true },
    { name: 'email', label: '이메일', type: 'email' },
    { name: 'phone', label: '휴대폰' },
    { name: 'memo', label: '메모', type: 'textarea', full: true },
  ];
}

async function dealFields() {
  return [
    { name: 'title', label: '딜 이름', required: true, full: true },
    { name: 'company_id', label: '고객사', type: 'select', options: await companyOptions() },
    { name: 'contact_id', label: '담당 연락처', type: 'select', options: await contactOptions() },
    { name: 'amount', label: '금액 (원)', type: 'number', placeholder: '0' },
    { name: 'stage', label: '단계', type: 'select', options: STAGES.map((s) => ({ value: s.key, label: s.label })) },
    { name: 'expected_close', label: '예상 마감일', type: 'date' },
    { name: 'owner', label: '담당자' },
    { name: 'memo', label: '메모', type: 'textarea', full: true },
  ];
}

// ===== 뷰: 대시보드 =====

async function renderDashboard() {
  const d = await api('/api/dashboard');
  const openTotal = Math.max(1, ...['lead', 'contacted', 'proposal', 'negotiation'].map((s) => d.byStage[s].count));

  const stageRows = ['lead', 'contacted', 'proposal', 'negotiation']
    .map((s) => {
      const { count, amount } = d.byStage[s];
      const pct = Math.round((count / openTotal) * 100);
      return `<div class="stage-row">
        <span class="badge ${s}">${STAGE_LABEL[s]}</span>
        <div class="bar"><div style="width:${pct}%"></div></div>
        <span class="num">${count}건 · ${money(amount)}</span>
      </div>`;
    })
    .join('');

  const closing = d.closing.length
    ? d.closing
        .map(
          (dl) => `<li>
            <span><span class="badge ${dl.stage}">${STAGE_LABEL[dl.stage]}</span> ${esc(dl.title)}</span>
            <span class="dim">${esc(dl.expected_close)} · ${money(dl.amount)}</span>
          </li>`
        )
        .join('')
    : '<li class="dim">예정된 마감 딜이 없습니다.</li>';

  const acts = d.recentActivities.length
    ? d.recentActivities
        .map((a) => {
          const meta = ACT_META[a.type] || ACT_META.note;
          return `<li>
            <span>${meta.icon} ${esc(a.deal_title || a.company_name || '')} — ${esc(a.content.slice(0, 40))}${a.content.length > 40 ? '…' : ''}</span>
            <span class="dim">${timeAgo(a.created_at)}</span>
          </li>`;
        })
        .join('')
    : '<li class="dim">활동 기록이 없습니다.</li>';

  content.innerHTML = `
    <div class="stat-grid">
      <div class="card stat"><div class="label">진행 중 파이프라인</div><div class="value">${money(d.pipeline.amount)}</div><div class="sub">${d.pipeline.count}건 진행 중</div></div>
      <div class="card stat"><div class="label">이번 달 성사</div><div class="value">${money(d.wonThisMonth.amount)}</div><div class="sub">${d.wonThisMonth.count}건 성사</div></div>
      <div class="card stat"><div class="label">고객사</div><div class="value">${d.companies}곳</div><div class="sub">연락처 ${d.contacts}명</div></div>
      <div class="card stat"><div class="label">전체 성사/실패</div><div class="value">${d.byStage.won.count} / ${d.byStage.lost.count}</div><div class="sub">누적 ${money(d.byStage.won.amount)} 성사</div></div>
    </div>
    <div class="dash-grid">
      <div class="card panel">
        <h2>단계별 파이프라인</h2>
        <div class="stage-bar">${stageRows}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="card panel"><h2>다가오는 마감</h2><ul class="list-plain">${closing}</ul></div>
        <div class="card panel"><h2>최근 활동</h2><ul class="list-plain">${acts}</ul></div>
      </div>
    </div>`;
}

// ===== 뷰: 파이프라인 (칸반) =====

async function renderPipeline() {
  const deals = await api('/api/deals');
  const cols = STAGES.map((s) => {
    const list = deals.filter((d) => d.stage === s.key);
    const sum = list.reduce((acc, d) => acc + d.amount, 0);
    const cards = list
      .map(
        (d) => `<div class="deal-card" draggable="true" data-id="${d.id}">
          <div class="title">${esc(d.title)}</div>
          <div class="meta">
            <span>${esc(d.company_name || '고객사 미지정')}</span>
            <span class="amount">${money(d.amount)}</span>
            ${d.expected_close ? `<span>마감 ${esc(d.expected_close)}</span>` : ''}
          </div>
        </div>`
      )
      .join('');
    return `<div class="kanban-col" data-stage="${s.key}">
      <h3><span><span class="badge ${s.key}">${s.label}</span> ${list.length}</span><span class="sum">${money(sum)}</span></h3>
      <div class="kanban-cards">${cards}</div>
    </div>`;
  }).join('');

  content.innerHTML = `<div class="kanban">${cols}</div>`;

  // 드래그 & 드롭
  let draggingId = null;
  content.querySelectorAll('.deal-card').forEach((card) => {
    card.addEventListener('dragstart', () => {
      draggingId = card.dataset.id;
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('click', () => openDealModal(Number(card.dataset.id)));
  });
  content.querySelectorAll('.kanban-col').forEach((col) => {
    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      col.classList.add('drag-over');
    });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', async (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');
      if (!draggingId) return;
      await api(`/api/deals/${draggingId}`, { method: 'PATCH', body: { stage: col.dataset.stage } });
      toast(`딜을 '${STAGE_LABEL[col.dataset.stage]}' 단계로 이동했습니다.`);
      renderPipeline();
    });
  });
}

async function openDealModal(id) {
  const [deal, fields] = await Promise.all([id ? api(`/api/deals/${id}`) : null, dealFields()]);
  openModal({
    title: id ? '딜 수정' : '새 딜',
    fields,
    initial: deal || { stage: 'lead' },
    onSubmit: async (body) => {
      if (id) await api(`/api/deals/${id}`, { method: 'PUT', body });
      else await api('/api/deals', { method: 'POST', body });
      toast(id ? '딜을 수정했습니다.' : '딜을 추가했습니다.');
      rerender();
    },
    onDelete: id
      ? async () => {
          await api(`/api/deals/${id}`, { method: 'DELETE' });
          toast('딜을 삭제했습니다.');
          rerender();
        }
      : undefined,
  });
}

// ===== 뷰: 딜 목록 =====

async function renderDeals(q = '', stage = '') {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (stage) params.set('stage', stage);
  const deals = await api('/api/deals?' + params);

  const stageOpts = ['<option value="">전체 단계</option>']
    .concat(STAGES.map((s) => `<option value="${s.key}" ${s.key === stage ? 'selected' : ''}>${s.label}</option>`))
    .join('');

  const rows = deals
    .map(
      (d) => `<tr>
        <td><span class="row-link" data-id="${d.id}">${esc(d.title)}</span></td>
        <td>${esc(d.company_name || '-')}</td>
        <td>${esc(d.contact_name || '-')}</td>
        <td><span class="badge ${d.stage}">${STAGE_LABEL[d.stage]}</span></td>
        <td>${money(d.amount)}</td>
        <td>${esc(d.expected_close || '-')}</td>
        <td>${esc(d.owner || '-')}</td>
      </tr>`
    )
    .join('');

  content.innerHTML = `
    <div class="toolbar">
      <input class="input search" id="deal-q" placeholder="딜/고객사 검색" value="${esc(q)}" />
      <select class="input" id="deal-stage" style="width:130px">${stageOpts}</select>
      <div class="spacer"></div>
    </div>
    <div class="card table-wrap">
      ${deals.length ? `<table><thead><tr><th>딜</th><th>고객사</th><th>연락처</th><th>단계</th><th>금액</th><th>예상 마감</th><th>담당</th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">딜이 없습니다. 우측 상단에서 추가해보세요.</div>'}
    </div>`;

  $('#deal-q').addEventListener('input', debounce((e) => renderDeals(e.target.value, $('#deal-stage').value), 300));
  $('#deal-stage').addEventListener('change', (e) => renderDeals($('#deal-q').value, e.target.value));
  content.querySelectorAll('.row-link').forEach((el) =>
    el.addEventListener('click', () => openDealModal(Number(el.dataset.id)))
  );
}

// ===== 뷰: 고객사 =====

async function renderCompanies(q = '') {
  const companies = await api('/api/companies' + (q ? `?q=${encodeURIComponent(q)}` : ''));
  const rows = companies
    .map(
      (c) => `<tr>
        <td><span class="row-link" data-id="${c.id}">${esc(c.name)}</span></td>
        <td>${esc(c.industry || '-')}</td>
        <td>${esc(c.phone || '-')}</td>
        <td>${c.contact_count}명</td>
        <td>${c.deal_count}건</td>
        <td>${esc((c.memo || '').slice(0, 30))}</td>
      </tr>`
    )
    .join('');

  content.innerHTML = `
    <div class="toolbar">
      <input class="input search" id="co-q" placeholder="고객사 검색" value="${esc(q)}" />
    </div>
    <div class="card table-wrap">
      ${companies.length ? `<table><thead><tr><th>고객사</th><th>업종</th><th>전화</th><th>연락처</th><th>딜</th><th>메모</th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">고객사가 없습니다.</div>'}
    </div>`;

  $('#co-q').addEventListener('input', debounce((e) => renderCompanies(e.target.value), 300));
  content.querySelectorAll('.row-link').forEach((el) =>
    el.addEventListener('click', () => openCompanyModal(Number(el.dataset.id)))
  );
}

async function openCompanyModal(id) {
  const company = id ? await api(`/api/companies/${id}`) : null;
  openModal({
    title: id ? '고객사 수정' : '새 고객사',
    fields: companyFields(),
    initial: company || {},
    onSubmit: async (body) => {
      if (id) await api(`/api/companies/${id}`, { method: 'PUT', body });
      else await api('/api/companies', { method: 'POST', body });
      toast(id ? '고객사를 수정했습니다.' : '고객사를 추가했습니다.');
      rerender();
    },
    onDelete: id
      ? async () => {
          await api(`/api/companies/${id}`, { method: 'DELETE' });
          toast('고객사를 삭제했습니다.');
          rerender();
        }
      : undefined,
  });
}

// ===== 뷰: 연락처 =====

async function renderContacts(q = '') {
  const contacts = await api('/api/contacts' + (q ? `?q=${encodeURIComponent(q)}` : ''));
  const rows = contacts
    .map(
      (c) => `<tr>
        <td><span class="row-link" data-id="${c.id}">${esc(c.name)}</span></td>
        <td>${esc(c.title || '-')}</td>
        <td>${esc(c.company_name || '-')}</td>
        <td>${esc(c.email || '-')}</td>
        <td>${esc(c.phone || '-')}</td>
      </tr>`
    )
    .join('');

  content.innerHTML = `
    <div class="toolbar">
      <input class="input search" id="ct-q" placeholder="이름/이메일/직함 검색" value="${esc(q)}" />
    </div>
    <div class="card table-wrap">
      ${contacts.length ? `<table><thead><tr><th>이름</th><th>직함</th><th>고객사</th><th>이메일</th><th>휴대폰</th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">연락처가 없습니다.</div>'}
    </div>`;

  $('#ct-q').addEventListener('input', debounce((e) => renderContacts(e.target.value), 300));
  content.querySelectorAll('.row-link').forEach((el) =>
    el.addEventListener('click', () => openContactModal(Number(el.dataset.id)))
  );
}

async function openContactModal(id) {
  const [contact, fields] = await Promise.all([id ? api(`/api/contacts/${id}`) : null, contactFields()]);
  openModal({
    title: id ? '연락처 수정' : '새 연락처',
    fields,
    initial: contact || {},
    onSubmit: async (body) => {
      if (id) await api(`/api/contacts/${id}`, { method: 'PUT', body });
      else await api('/api/contacts', { method: 'POST', body });
      toast(id ? '연락처를 수정했습니다.' : '연락처를 추가했습니다.');
      rerender();
    },
    onDelete: id
      ? async () => {
          await api(`/api/contacts/${id}`, { method: 'DELETE' });
          toast('연락처를 삭제했습니다.');
          rerender();
        }
      : undefined,
  });
}

// ===== 뷰: 활동 =====

async function renderActivities() {
  const acts = await api('/api/activities');
  const items = acts
    .map((a) => {
      const meta = ACT_META[a.type] || ACT_META.note;
      return `<div class="card activity">
        <div class="icon">${meta.icon}</div>
        <div class="body">
          <div class="head">
            <span class="who">${esc(a.deal_title || a.company_name || '일반')}</span>
            <span class="badge">${meta.label}</span>
            <span class="when">${timeAgo(a.created_at)}</span>
          </div>
          <div class="text">${esc(a.content)}</div>
        </div>
        <button class="btn small danger" data-id="${a.id}">삭제</button>
      </div>`;
    })
    .join('');

  content.innerHTML = `<div class="timeline">${items || '<div class="empty">활동 기록이 없습니다.</div>'}</div>`;

  content.querySelectorAll('.activity .btn.danger').forEach((btn) =>
    btn.addEventListener('click', async () => {
      if (!confirm('이 활동을 삭제할까요?')) return;
      await api(`/api/activities/${btn.dataset.id}`, { method: 'DELETE' });
      toast('활동을 삭제했습니다.');
      renderActivities();
    })
  );
}

async function openActivityModal() {
  const deals = await api('/api/deals');
  openModal({
    title: '활동 기록',
    fields: [
      { name: 'type', label: '유형', type: 'select', options: ACTIVITY_TYPES.map((t) => ({ value: t.key, label: `${t.icon} ${t.label}` })) },
      { name: 'deal_id', label: '관련 딜', type: 'select', options: [{ value: '', label: '(없음)' }, ...deals.map((d) => ({ value: d.id, label: d.title }))] },
      { name: 'content', label: '내용', type: 'textarea', required: true, full: true },
    ],
    onSubmit: async (body) => {
      await api('/api/activities', { method: 'POST', body });
      toast('활동을 기록했습니다.');
      rerender();
    },
  });
}

// ===== 라우팅 =====

let currentView = 'dashboard';

const VIEWS = {
  dashboard: { render: renderDashboard },
  pipeline: { render: renderPipeline, action: { label: '+ 새 딜', fn: () => openDealModal() } },
  deals: { render: () => renderDeals(), action: { label: '+ 새 딜', fn: () => openDealModal() } },
  companies: { render: () => renderCompanies(), action: { label: '+ 새 고객사', fn: () => openCompanyModal() } },
  contacts: { render: () => renderContacts(), action: { label: '+ 새 연락처', fn: () => openContactModal() } },
  activities: { render: renderActivities, action: { label: '+ 활동 기록', fn: openActivityModal } },
};

function rerender() {
  setView(currentView);
}

function setView(view) {
  currentView = view;
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  $('#view-title').textContent = VIEW_TITLES[view];

  const actions = $('#topbar-actions');
  actions.innerHTML = '';
  const def = VIEWS[view];
  if (def.action) {
    const btn = document.createElement('button');
    btn.className = 'btn primary';
    btn.textContent = def.action.label;
    btn.addEventListener('click', def.action.fn);
    actions.appendChild(btn);
  }

  content.innerHTML = '<div class="empty">불러오는 중…</div>';
  def.render().catch(() => {
    content.innerHTML = '<div class="empty">데이터를 불러오지 못했습니다.</div>';
  });
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

$('#nav').addEventListener('click', (e) => {
  const btn = e.target.closest('.nav-item');
  if (btn) setView(btn.dataset.view);
});

setView('dashboard');
