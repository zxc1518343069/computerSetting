#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { initializeSqliteDatabase } = require('../lib/db/migrations');

const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data', 'computer.db');
const schemaPath = path.join(process.cwd(), 'lib', 'db', 'schema.sql');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

try {
    const result = initializeSqliteDatabase(db, {
        schemaPath,
        logger: (message) => console.log(message),
    });

    console.log(
        `SQLite migrations completed. applied=${result.applied.length}, skipped=${result.skipped.length}`
    );
} finally {
    db.close();
}
