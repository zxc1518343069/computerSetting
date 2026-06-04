import type Database from 'better-sqlite3';

export interface SqliteMigrationResult {
    applied: string[];
    skipped: string[];
}

export interface SqliteMigrationOptions {
    logger?: (message: string) => void;
    schemaPath?: string;
}

export function initializeSqliteDatabase(
    database: Database.Database,
    options?: SqliteMigrationOptions
): SqliteMigrationResult;

export function runSqliteMigrations(
    database: Database.Database,
    options?: SqliteMigrationOptions
): SqliteMigrationResult;
