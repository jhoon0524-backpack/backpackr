'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { db } = require('./lib/db');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');

const STAGES = ['lead', 'contacted', 'proposal', 'negotiation', 'won', 'lost'];
const ACTIVITY_TYPES = ['call', 'meeting', 'email', 'note'];

// ---------- 유틸 ----------

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error('body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function str(v, max = 500) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function intOrNull(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// ---------- 리소스 핸들러 ----------

const companyApi = {
  list(query) {
    const q = str(query.get('q'), 100);
    const rows = q
      ? db
          .prepare(
            `SELECT c.*,
                    (SELECT COUNT(*) FROM contacts t WHERE t.company_id = c.id) AS contact_count,
                    (SELECT COUNT(*) FROM deals d WHERE d.company_id = c.id) AS deal_count
             FROM companies c
             WHERE c.name LIKE ? OR c.industry LIKE ? OR c.memo LIKE ?
             ORDER BY c.id DESC`
          )
          .all(`%${q}%`, `%${q}%`, `%${q}%`)
      : db
          .prepare(
            `SELECT c.*,
                    (SELECT COUNT(*) FROM contacts t WHERE t.company_id = c.id) AS contact_count,
                    (SELECT COUNT(*) FROM deals d WHERE d.company_id = c.id) AS deal_count
             FROM companies c ORDER BY c.id DESC`
          )
          .all();
    return rows;
  },
  create(body) {
    const name = str(body.name, 100);
    if (!name) throw Object.assign(new Error('고객사명은 필수입니다.'), { status: 400 });
    const r = db
      .prepare('INSERT INTO companies (name, industry, website, phone, memo) VALUES (?, ?, ?, ?, ?)')
      .run(name, str(body.industry, 50), str(body.website, 200), str(body.phone, 30), str(body.memo, 2000));
    return db.prepare('SELECT * FROM companies WHERE id = ?').get(Number(r.lastInsertRowid));
  },
  update(id, body) {
    const cur = db.prepare('SELECT * FROM companies WHERE id = ?').get(id);
    if (!cur) throw Object.assign(new Error('고객사를 찾을 수 없습니다.'), { status: 404 });
    const name = 'name' in body ? str(body.name, 100) : cur.name;
    if (!name) throw Object.assign(new Error('고객사명은 필수입니다.'), { status: 400 });
    db.prepare('UPDATE companies SET name=?, industry=?, website=?, phone=?, memo=? WHERE id=?').run(
      name,
      'industry' in body ? str(body.industry, 50) : cur.industry,
      'website' in body ? str(body.website, 200) : cur.website,
      'phone' in body ? str(body.phone, 30) : cur.phone,
      'memo' in body ? str(body.memo, 2000) : cur.memo,
      id
    );
    return db.prepare('SELECT * FROM companies WHERE id = ?').get(id);
  },
  remove(id) {
    const r = db.prepare('DELETE FROM companies WHERE id = ?').run(id);
    if (r.changes === 0) throw Object.assign(new Error('고객사를 찾을 수 없습니다.'), { status: 404 });
    return { ok: true };
  },
};

const contactApi = {
  list(query) {
    const q = str(query.get('q'), 100);
    const companyId = intOrNull(query.get('company_id'));
    let sql = `SELECT t.*, c.name AS company_name
               FROM contacts t LEFT JOIN companies c ON c.id = t.company_id`;
    const where = [];
    const params = [];
    if (q) {
      where.push('(t.name LIKE ? OR t.email LIKE ? OR t.title LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (companyId) {
      where.push('t.company_id = ?');
      params.push(companyId);
    }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY t.id DESC';
    return db.prepare(sql).all(...params);
  },
  create(body) {
    const name = str(body.name, 50);
    if (!name) throw Object.assign(new Error('이름은 필수입니다.'), { status: 400 });
    const r = db
      .prepare('INSERT INTO contacts (company_id, name, title, email, phone, memo) VALUES (?, ?, ?, ?, ?, ?)')
      .run(intOrNull(body.company_id), name, str(body.title, 50), str(body.email, 100), str(body.phone, 30), str(body.memo, 2000));
    return db.prepare('SELECT * FROM contacts WHERE id = ?').get(Number(r.lastInsertRowid));
  },
  update(id, body) {
    const cur = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
    if (!cur) throw Object.assign(new Error('연락처를 찾을 수 없습니다.'), { status: 404 });
    const name = 'name' in body ? str(body.name, 50) : cur.name;
    if (!name) throw Object.assign(new Error('이름은 필수입니다.'), { status: 400 });
    db.prepare('UPDATE contacts SET company_id=?, name=?, title=?, email=?, phone=?, memo=? WHERE id=?').run(
      'company_id' in body ? intOrNull(body.company_id) : cur.company_id,
      name,
      'title' in body ? str(body.title, 50) : cur.title,
      'email' in body ? str(body.email, 100) : cur.email,
      'phone' in body ? str(body.phone, 30) : cur.phone,
      'memo' in body ? str(body.memo, 2000) : cur.memo,
      id
    );
    return db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
  },
  remove(id) {
    const r = db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
    if (r.changes === 0) throw Object.assign(new Error('연락처를 찾을 수 없습니다.'), { status: 404 });
    return { ok: true };
  },
};

const dealApi = {
  list(query) {
    const q = str(query.get('q'), 100);
    const stage = str(query.get('stage'), 20);
    let sql = `SELECT d.*, c.name AS company_name, t.name AS contact_name
               FROM deals d
               LEFT JOIN companies c ON c.id = d.company_id
               LEFT JOIN contacts t ON t.id = d.contact_id`;
    const where = [];
    const params = [];
    if (q) {
      where.push('(d.title LIKE ? OR c.name LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    if (stage && STAGES.includes(stage)) {
      where.push('d.stage = ?');
      params.push(stage);
    }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY d.updated_at DESC, d.id DESC';
    return db.prepare(sql).all(...params);
  },
  create(body) {
    const title = str(body.title, 200);
    if (!title) throw Object.assign(new Error('딜 이름은 필수입니다.'), { status: 400 });
    const stage = STAGES.includes(body.stage) ? body.stage : 'lead';
    const amount = Math.max(0, Math.floor(Number(body.amount) || 0));
    const r = db
      .prepare(
        `INSERT INTO deals (company_id, contact_id, title, amount, stage, expected_close, owner, memo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        intOrNull(body.company_id),
        intOrNull(body.contact_id),
        title,
        amount,
        stage,
        str(body.expected_close, 10),
        str(body.owner, 50),
        str(body.memo, 2000)
      );
    return db.prepare('SELECT * FROM deals WHERE id = ?').get(Number(r.lastInsertRowid));
  },
  update(id, body) {
    const cur = db.prepare('SELECT * FROM deals WHERE id = ?').get(id);
    if (!cur) throw Object.assign(new Error('딜을 찾을 수 없습니다.'), { status: 404 });
    const title = 'title' in body ? str(body.title, 200) : cur.title;
    if (!title) throw Object.assign(new Error('딜 이름은 필수입니다.'), { status: 400 });
    const stage = 'stage' in body && STAGES.includes(body.stage) ? body.stage : cur.stage;
    const amount = 'amount' in body ? Math.max(0, Math.floor(Number(body.amount) || 0)) : cur.amount;
    db.prepare(
      `UPDATE deals SET company_id=?, contact_id=?, title=?, amount=?, stage=?,
       expected_close=?, owner=?, memo=?, updated_at=datetime('now','localtime') WHERE id=?`
    ).run(
      'company_id' in body ? intOrNull(body.company_id) : cur.company_id,
      'contact_id' in body ? intOrNull(body.contact_id) : cur.contact_id,
      title,
      amount,
      stage,
      'expected_close' in body ? str(body.expected_close, 10) : cur.expected_close,
      'owner' in body ? str(body.owner, 50) : cur.owner,
      'memo' in body ? str(body.memo, 2000) : cur.memo,
      id
    );
    return db.prepare('SELECT * FROM deals WHERE id = ?').get(id);
  },
  remove(id) {
    const r = db.prepare('DELETE FROM deals WHERE id = ?').run(id);
    if (r.changes === 0) throw Object.assign(new Error('딜을 찾을 수 없습니다.'), { status: 404 });
    return { ok: true };
  },
};

const activityApi = {
  list(query) {
    const dealId = intOrNull(query.get('deal_id'));
    const companyId = intOrNull(query.get('company_id'));
    let sql = `SELECT a.*, d.title AS deal_title, c.name AS company_name
               FROM activities a
               LEFT JOIN deals d ON d.id = a.deal_id
               LEFT JOIN companies c ON c.id = a.company_id`;
    const where = [];
    const params = [];
    if (dealId) {
      where.push('a.deal_id = ?');
      params.push(dealId);
    }
    if (companyId) {
      where.push('a.company_id = ?');
      params.push(companyId);
    }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY a.id DESC LIMIT 200';
    return db.prepare(sql).all(...params);
  },
  create(body) {
    const content = str(body.content, 2000);
    if (!content) throw Object.assign(new Error('내용은 필수입니다.'), { status: 400 });
    const type = ACTIVITY_TYPES.includes(body.type) ? body.type : 'note';
    const dealId = intOrNull(body.deal_id);
    let companyId = intOrNull(body.company_id);
    if (!companyId && dealId) {
      const deal = db.prepare('SELECT company_id FROM deals WHERE id = ?').get(dealId);
      companyId = deal ? deal.company_id : null;
    }
    const r = db
      .prepare('INSERT INTO activities (deal_id, company_id, type, content) VALUES (?, ?, ?, ?)')
      .run(dealId, companyId, type, content);
    return db.prepare('SELECT * FROM activities WHERE id = ?').get(Number(r.lastInsertRowid));
  },
  remove(id) {
    const r = db.prepare('DELETE FROM activities WHERE id = ?').run(id);
    if (r.changes === 0) throw Object.assign(new Error('활동을 찾을 수 없습니다.'), { status: 404 });
    return { ok: true };
  },
};

function dashboard() {
  const openStages = ['lead', 'contacted', 'proposal', 'negotiation'];
  const byStage = {};
  for (const s of STAGES) {
    byStage[s] = db
      .prepare('SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount FROM deals WHERE stage = ?')
      .get(s);
  }
  const pipeline = db
    .prepare(
      `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount
       FROM deals WHERE stage IN ('lead','contacted','proposal','negotiation')`
    )
    .get();
  const wonThisMonth = db
    .prepare(
      `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount
       FROM deals WHERE stage = 'won' AND strftime('%Y-%m', updated_at) = strftime('%Y-%m', 'now', 'localtime')`
    )
    .get();
  const closing = db
    .prepare(
      `SELECT d.id, d.title, d.amount, d.stage, d.expected_close, c.name AS company_name
       FROM deals d LEFT JOIN companies c ON c.id = d.company_id
       WHERE d.stage IN ('lead','contacted','proposal','negotiation')
         AND d.expected_close != ''
       ORDER BY d.expected_close ASC LIMIT 5`
    )
    .all();
  const recentActivities = db
    .prepare(
      `SELECT a.*, d.title AS deal_title, c.name AS company_name
       FROM activities a
       LEFT JOIN deals d ON d.id = a.deal_id
       LEFT JOIN companies c ON c.id = a.company_id
       ORDER BY a.id DESC LIMIT 8`
    )
    .all();
  return {
    companies: db.prepare('SELECT COUNT(*) AS n FROM companies').get().n,
    contacts: db.prepare('SELECT COUNT(*) AS n FROM contacts').get().n,
    pipeline,
    wonThisMonth,
    byStage,
    openStages,
    closing,
    recentActivities,
  };
}

// ---------- 라우팅 ----------

const RESOURCES = {
  companies: companyApi,
  contacts: contactApi,
  deals: dealApi,
  activities: activityApi,
};

async function handleApi(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean); // ['api', resource, id?]
  const resource = parts[1];
  const id = parts[2] !== undefined ? intOrNull(parts[2]) : undefined;

  if (resource === 'dashboard' && req.method === 'GET') {
    return sendJson(res, 200, dashboard());
  }
  if (resource === 'meta' && req.method === 'GET') {
    return sendJson(res, 200, { stages: STAGES, activityTypes: ACTIVITY_TYPES });
  }

  const api = RESOURCES[resource];
  if (!api) return sendJson(res, 404, { error: 'not found' });

  if (parts.length === 2) {
    if (req.method === 'GET') return sendJson(res, 200, api.list(url.searchParams));
    if (req.method === 'POST') return sendJson(res, 201, api.create(await readBody(req)));
  } else if (parts.length === 3 && id) {
    if (req.method === 'GET' && api.list) {
      const row = db.prepare(`SELECT * FROM ${resource} WHERE id = ?`).get(id);
      return row ? sendJson(res, 200, row) : sendJson(res, 404, { error: 'not found' });
    }
    if ((req.method === 'PUT' || req.method === 'PATCH') && api.update) {
      return sendJson(res, 200, api.update(id, await readBody(req)));
    }
    if (req.method === 'DELETE') return sendJson(res, 200, api.remove(id));
  }
  return sendJson(res, 405, { error: 'method not allowed' });
}

// ---------- 정적 파일 ----------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function serveStatic(res, pathname) {
  let file = pathname === '/' ? '/index.html' : pathname;
  file = path.normalize(file).replace(/^(\.\.[/\\])+/, '');
  const full = path.join(PUBLIC_DIR, file);
  if (!full.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('forbidden');
  }
  fs.readFile(full, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('not found');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
    } else {
      serveStatic(res, url.pathname);
    }
  } catch (err) {
    const status = err.status || (err.message === 'invalid JSON' ? 400 : 500);
    if (status >= 500) console.error(err);
    sendJson(res, status, { error: err.message || 'server error' });
  }
});

server.listen(PORT, () => {
  console.log(`영업 CRM 서버 실행 중: http://localhost:${PORT}`);
});
