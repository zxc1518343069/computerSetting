import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { initializeSqliteDatabase } from './migrations';

const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data', 'computer.db');
const schemaPath = path.join(process.cwd(), 'lib', 'db', 'schema.sql');

let db: Database.Database | null = null;

export const getDb = () => {
    if (db) return db;

    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new Database(dbPath);
    initializeSqliteDatabase(db, { schemaPath });

    return db;
};

export type SqliteDb = Database.Database;
