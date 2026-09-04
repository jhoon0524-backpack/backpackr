'use strict';

const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.CRM_DB_PATH || path.join(__dirname, '..', 'data', 'crm.db');

const fs = require('node:fs');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS companies (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    industry   TEXT DEFAULT '',
    website    TEXT DEFAULT '',
    phone      TEXT DEFAULT '',
    memo       TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    name       TEXT NOT NULL,
    title      TEXT DEFAULT '',
    email      TEXT DEFAULT '',
    phone      TEXT DEFAULT '',
    memo       TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS deals (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id     INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    contact_id     INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
    title          TEXT NOT NULL,
    amount         INTEGER NOT NULL DEFAULT 0,
    stage          TEXT NOT NULL DEFAULT 'lead'
                   CHECK (stage IN ('lead','contacted','proposal','negotiation','won','lost')),
    expected_close TEXT DEFAULT '',
    owner          TEXT DEFAULT '',
    memo           TEXT DEFAULT '',
    created_at     TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS activities (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    deal_id    INTEGER REFERENCES deals(id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    type       TEXT NOT NULL DEFAULT 'note'
               CHECK (type IN ('call','meeting','email','note')),
    content    TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);
  CREATE INDEX IF NOT EXISTS idx_deals_company    ON deals(company_id);
  CREATE INDEX IF NOT EXISTS idx_deals_stage      ON deals(stage);
  CREATE INDEX IF NOT EXISTS idx_activities_deal  ON activities(deal_id);
`);

module.exports = { db, DB_PATH };
