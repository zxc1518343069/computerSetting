import { getDb } from '../lib/db';

const db = getDb();
const productCount = db.prepare('SELECT COUNT(*) AS count FROM products').get() as {
    count: number;
};

console.log(`SQLite database initialized. products=${productCount.count}`);
