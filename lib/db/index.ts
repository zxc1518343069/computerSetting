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
    if (columns.some((item) => item.name === column)) return false;

    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    return true;
};

const migrateLegacyInboundOrders = (database: Database.Database) => {
    const legacyOrders = database
        .prepare(
            `
            SELECT *
            FROM inbound_orders
            WHERE purchase_order_id IS NULL
        `
        )
        .all() as Array<Record<string, unknown>>;

    if (legacyOrders.length === 0) return;

    const migrate = database.transaction(() => {
        const insertPurchaseOrder = database.prepare(
            `
            INSERT INTO purchase_orders (
                supplier_id, status, ordered_at, expected_inbound_at,
                shipping_fee_cents, misc_fee_cents, note, updated_at
            )
            VALUES (
                @supplier_id, 'completed', @ordered_at, NULL,
                @shipping_fee_cents, @misc_fee_cents, @note, CURRENT_TIMESTAMP
            )
        `
        );
        const insertPurchaseItem = database.prepare(
            `
            INSERT INTO purchase_order_items (
                purchase_order_id, product_id, ordered_quantity, received_quantity,
                purchase_price_cents, note, updated_at
            )
            VALUES (
                @purchase_order_id, @product_id, @ordered_quantity, @received_quantity,
                @purchase_price_cents, @note, CURRENT_TIMESTAMP
            )
        `
        );
        const updateInboundItem = database.prepare(
            `
            UPDATE inbound_order_items
            SET purchase_order_item_id = @purchase_order_item_id
            WHERE id = @id
        `
        );
        const insertPayment = database.prepare(
            `
            INSERT INTO purchase_payments (
                purchase_order_id, amount_cents, payment_account, paid_at,
                status, note, updated_at
            )
            VALUES (
                @purchase_order_id, @amount_cents, NULL, @paid_at,
                'active', '历史入库单迁移生成', CURRENT_TIMESTAMP
            )
        `
        );
        const updateInboundOrder = database.prepare(
            `
            UPDATE inbound_orders
            SET source_type = 'purchase_order',
                purchase_order_id = @purchase_order_id,
                status = 'completed',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `
        );
        const itemsStmt = database.prepare(
            'SELECT * FROM inbound_order_items WHERE inbound_order_id = ? ORDER BY id ASC'
        );

        legacyOrders.forEach((order) => {
            const purchaseOrder = insertPurchaseOrder.run({
                supplier_id: order.supplier_id,
                ordered_at: order.inbound_at || order.created_at,
                shipping_fee_cents: order.shipping_fee_cents || 0,
                misc_fee_cents: order.misc_fee_cents || 0,
                note: order.note,
            });
            const purchaseOrderId = Number(purchaseOrder.lastInsertRowid);
            const items = itemsStmt.all(order.id) as Array<Record<string, unknown>>;
            let goodsAmountCents = 0;

            items.forEach((item) => {
                const quantity = Number(item.quantity || 0);
                const purchasePriceCents = Number(item.purchase_price_cents || 0);
                goodsAmountCents += quantity * purchasePriceCents;

                const purchaseItem = insertPurchaseItem.run({
                    purchase_order_id: purchaseOrderId,
                    product_id: item.product_id,
                    ordered_quantity: quantity,
                    received_quantity: quantity,
                    purchase_price_cents: purchasePriceCents,
                    note: item.note,
                });

                updateInboundItem.run({
                    id: item.id,
                    purchase_order_item_id: Number(purchaseItem.lastInsertRowid),
                });
            });

            if (Number(order.is_paid || 0) === 1) {
                insertPayment.run({
                    purchase_order_id: purchaseOrderId,
                    amount_cents:
                        goodsAmountCents +
                        Number(order.shipping_fee_cents || 0) +
                        Number(order.misc_fee_cents || 0),
                    paid_at: order.inbound_at || order.created_at,
                });
            }

            updateInboundOrder.run({
                id: order.id,
                purchase_order_id: purchaseOrderId,
            });
        });
    });

    migrate();
};

const runCompatMigrations = (database: Database.Database) => {
    ensureColumn(database, 'products', 'barcode', 'TEXT');
    ensureColumn(database, 'sales_orders', 'is_paid', 'INTEGER NOT NULL DEFAULT 0');
    const addedInboundSource = ensureColumn(
        database,
        'inbound_orders',
        'source_type',
        "TEXT NOT NULL DEFAULT 'opening_stock'"
    );
    const addedInboundPurchaseOrder = ensureColumn(
        database,
        'inbound_orders',
        'purchase_order_id',
        'INTEGER REFERENCES purchase_orders (id)'
    );
    ensureColumn(database, 'inbound_orders', 'status', "TEXT NOT NULL DEFAULT 'completed'");
    ensureColumn(
        database,
        'inbound_order_items',
        'purchase_order_item_id',
        'INTEGER REFERENCES purchase_order_items (id)'
    );
    ensureColumn(
        database,
        'inbound_order_items',
        'serial_tracking_enabled',
        'INTEGER NOT NULL DEFAULT 0'
    );
    database.exec(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL AND barcode <> ''"
    );
    if (addedInboundSource || addedInboundPurchaseOrder) {
        migrateLegacyInboundOrders(database);
    }
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
