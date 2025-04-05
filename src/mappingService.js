import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { generateOurParam } from './paramUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../db/database.sqlite');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    src TEXT NOT NULL,
    creative TEXT NOT NULL,
    our_param TEXT NOT NULL UNIQUE,
    version INTEGER NOT NULL DEFAULT 1,
    previous_param TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

function getOrCreateMapping({ keyword, src, creative }) {
  const result = db.prepare(`
    SELECT our_param FROM mappings
    WHERE keyword = ? AND src = ? AND creative = ?
    ORDER BY version DESC LIMIT 1
  `).get(keyword, src, creative);

  if (result) return result.our_param;

  const our_param = generateOurParam({ keyword, src, creative });

  db.prepare(`
    INSERT INTO mappings (keyword, src, creative, our_param, version)
    VALUES (?, ?, ?, ?, 1)
  `).run(keyword, src, creative, our_param);

  return our_param;
}

function refreshMapping({ keyword, src, creative }) {
  const last = db.prepare(`
    SELECT our_param, version FROM mappings
    WHERE keyword = ? AND src = ? AND creative = ?
    ORDER BY version DESC LIMIT 1
  `).get(keyword, src, creative);

  const new_version = last ? last.version + 1 : 1;
  const previous_param = last ? last.our_param : null;

  let new_param;
  let attempts = 0;
  do {
    const salt = crypto.randomBytes(4).toString('hex');
    new_param = generateOurParam({ keyword, src, creative }, salt);
    const exists = db.prepare('SELECT 1 FROM mappings WHERE our_param = ?').get(new_param);
    if (!exists) break;
    attempts++;
  } while (attempts < 5);

  db.prepare(`
    INSERT INTO mappings (keyword, src, creative, our_param, version, previous_param)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(keyword, src, creative, new_param, new_version, previous_param);

  return { new_param, version: new_version, previous_param };
}

function getMappingByOurParam(our_param) {
  return db.prepare(`
    SELECT keyword, src, creative FROM mappings WHERE our_param = ?
  `).get(our_param);
}

function getMostRecentMapping() {
  return db.prepare(`
    SELECT keyword, src, creative, our_param FROM mappings
    ORDER BY created_at DESC
    LIMIT 1
  `).get();
}

export {
  getOrCreateMapping,
  getMappingByOurParam,
  refreshMapping,
  getMostRecentMapping
};
