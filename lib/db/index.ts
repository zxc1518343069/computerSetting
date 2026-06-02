import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data', 'computer.db');
const schemaPath = path.join(process.cwd(), 'lib', 'db', 'schema.sql');

let db: Database.Database | null = null;

const ensureColumn = (
    database: Database.Database,
    table: string,
    column: string,
    definition: string
) => {
    const columns = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{
        name: string;
    }>;
    if (columns.some((item) => item.name === column)) return;

    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
};

const runCompatMigrations = (database: Database.Database) => {
    ensureColumn(database, 'products', 'barcode', 'TEXT');
    ensureColumn(database, 'sales_orders', 'is_paid', 'INTEGER NOT NULL DEFAULT 0');
    database.exec(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL AND barcode <> ''"
    );
};

export const getDb = () => {
    if (db) return db;

    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');

    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
    runCompatMigrations(db);

    return db;
};

export type SqliteDb = Database.Database;
