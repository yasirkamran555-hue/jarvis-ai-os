import sqlite3 from 'sqlite3';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const databaseDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data');
const databasePath = path.join(databaseDirectory, 'jarvis.db');
let database;
let initialization;
let writeQueue = Promise.resolve();

function run(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    database.run(sql, parameters, function onRun(error) {
      if (error) reject(error);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    database.get(sql, parameters, (error, row) => {
      if (error) reject(error);
      else resolve(row);
    });
  });
}

function all(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    database.all(sql, parameters, (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });
}

function enqueueWrite(operation) {
  const result = writeQueue.then(operation);
  writeQueue = result.catch(() => {});
  return result;
}

async function createTables() {
  await run('PRAGMA journal_mode = WAL');
  await run('PRAGMA busy_timeout = 5000');
  await run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      messages TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS executions (
      id TEXT PRIMARY KEY,
      language TEXT,
      code TEXT,
      output TEXT,
      exit_code INTEGER,
      duration_ms INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS system_events (
      id TEXT PRIMARY KEY,
      event_type TEXT,
      data TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS preferences (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id TEXT PRIMARY KEY,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      content BLOB NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export function initDatabase() {
  if (initialization) return initialization;

  initialization = (async () => {
    await mkdir(databaseDirectory, { recursive: true });
    await new Promise((resolve, reject) => {
      database = new sqlite3.Database(databasePath, error => error ? reject(error) : resolve());
    });
    await createTables();
    console.log(`Local JARVIS database ready at ${databasePath}`);
  })();

  return initialization;
}

export async function listConversations() {
  const rows = await all('SELECT id, title, messages, created_at, updated_at FROM conversations ORDER BY updated_at DESC');
  return rows.map(row => ({ ...row, messages: JSON.parse(row.messages) }));
}

export async function saveConversations(conversations) {
  return enqueueWrite(async () => {
    await run('BEGIN IMMEDIATE');
    try {
      if (conversations.length === 0) {
        await run('DELETE FROM conversations');
      } else {
        const placeholders = conversations.map(() => '?').join(', ');
        await run(
          `DELETE FROM conversations WHERE id NOT IN (${placeholders})`,
          conversations.map(conversation => conversation.id)
        );
      }
      for (const conversation of conversations) {
        await run(
          `INSERT INTO conversations (id, title, messages, updated_at)
           VALUES (?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title,
             messages = excluded.messages,
             updated_at = CURRENT_TIMESTAMP`,
          [conversation.id, conversation.title || '', JSON.stringify(conversation.messages)]
        );
      }
      await run('COMMIT');
    } catch (error) {
      await run('ROLLBACK');
      throw error;
    }
  });
}

export async function deleteConversation(id) {
  return enqueueWrite(() => run('DELETE FROM conversations WHERE id = ?', [id]));
}

export async function getPreferences() {
  const rows = await all('SELECT key, value FROM preferences');
  return Object.fromEntries(rows.map(row => [row.key, JSON.parse(row.value)]));
}

export async function savePreferences(preferences) {
  return enqueueWrite(async () => {
    await run('BEGIN IMMEDIATE');
    try {
      for (const [key, value] of Object.entries(preferences)) {
        await run(
          `INSERT INTO preferences (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
          [key, JSON.stringify(value)]
        );
      }
      await run('COMMIT');
    } catch (error) {
      await run('ROLLBACK');
      throw error;
    }
  });
}

export function listMemories() {
  return all('SELECT id, content, created_at FROM memories ORDER BY created_at DESC');
}

export async function addMemory(id, content) {
  return enqueueWrite(async () => {
    await run('INSERT INTO memories (id, content) VALUES (?, ?)', [id, content]);
    return get('SELECT id, content, created_at FROM memories WHERE id = ?', [id]);
  });
}

export function deleteMemory(id) {
  return enqueueWrite(() => run('DELETE FROM memories WHERE id = ?', [id]));
}

export function saveUploadedFile({ id, name, mimeType, content }) {
  return enqueueWrite(() => run(
    'INSERT INTO uploaded_files (id, original_name, mime_type, size, content) VALUES (?, ?, ?, ?, ?)',
    [id, name, mimeType, content.length, content]
  ));
}

export function listUploadedFiles() {
  return all('SELECT id, original_name AS name, mime_type AS mimeType, size, created_at AS createdAt FROM uploaded_files ORDER BY created_at DESC');
}

export function getUploadedFile(id) {
  return get('SELECT id, original_name AS name, mime_type AS mimeType, size, content FROM uploaded_files WHERE id = ?', [id]);
}

export function deleteUploadedFile(id) {
  return enqueueWrite(() => run('DELETE FROM uploaded_files WHERE id = ?', [id]));
}

export function saveExecution(id, language, code, output, exitCode, durationMs) {
  return enqueueWrite(() => run(
    'INSERT INTO executions (id, language, code, output, exit_code, duration_ms) VALUES (?, ?, ?, ?, ?, ?)',
    [id, language, code, output, exitCode, durationMs]
  ));
}

export async function closeDatabase() {
  if (!database) return;
  await writeQueue;
  await new Promise((resolve, reject) => {
    database.close(error => error ? reject(error) : resolve());
  });
  database = undefined;
  initialization = undefined;
}
