import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
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

const ensureAdminUsersTable = (database: Database.Database) => {
    database.exec(`
        CREATE TABLE IF NOT EXISTS admin_users
        (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
            status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
            last_login_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_admin_users_role_status
            ON admin_users(role, status);
    `);
};

const ensureDefaultSuperAdmin = (database: Database.Database) => {
    const username = 'yangshuhao';
    const existing = database
        .prepare('SELECT id FROM admin_users WHERE username = ?')
        .get(username) as { id: number } | undefined;

    if (!existing) {
        database
            .prepare(
                `
                INSERT INTO admin_users (username, password_hash, role, status, updated_at)
                VALUES (@username, @password_hash, 'admin', 'active', CURRENT_TIMESTAMP)
            `
            )
            .run({
                username,
                password_hash: bcrypt.hashSync('wangman', 10),
            });
        return;
    }

    database
        .prepare(
            `
            UPDATE admin_users
            SET role = 'admin',
                status = 'active',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `
        )
        .run(existing.id);
};

const ensureCustomersTable = (database: Database.Database) => {
    database.exec(`
        CREATE TABLE IF NOT EXISTS customers
        (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL CHECK (phone <> ''),
            wechat TEXT,
            address TEXT,
            note TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_customers_name_phone
            ON customers(name, phone);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_phone_unique
            ON customers(phone);
    `);
};

const ensureSalesOrderAdjustmentTables = (database: Database.Database) => {
    database.exec(`
        CREATE TABLE IF NOT EXISTS sales_order_adjustments
        (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
            previous_adjustment_id INTEGER REFERENCES sales_order_adjustments(id),
            original_amount_cents INTEGER NOT NULL DEFAULT 0,
            previous_adjusted_amount_cents INTEGER NOT NULL DEFAULT 0,
            adjusted_amount_cents INTEGER NOT NULL DEFAULT 0,
            previous_final_amount_cents INTEGER NOT NULL DEFAULT 0,
            final_amount_cents INTEGER NOT NULL DEFAULT 0,
            adjustment_note TEXT NOT NULL,
            created_by_user_id INTEGER,
            created_by_username TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_sales_order_adjustments_order_created
            ON sales_order_adjustments(order_id, created_at);

        CREATE TABLE IF NOT EXISTS sales_order_adjustment_items
        (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            adjustment_id INTEGER NOT NULL REFERENCES sales_order_adjustments(id) ON DELETE CASCADE,
            source_order_item_id INTEGER REFERENCES sales_order_items(id) ON DELETE SET NULL,
            product_id INTEGER NOT NULL REFERENCES products(id),
            product_name TEXT NOT NULL,
            product_category TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            sale_price_cents INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_sales_order_adjustment_items_adjustment
            ON sales_order_adjustment_items(adjustment_id);
    `);
};

const ensureOrderInventoryAdjustmentBinding = (database: Database.Database) => {
    const columns = database.prepare('PRAGMA table_info(order_inventory_items)').all() as Array<{
        name: string;
        notnull: number;
    }>;
    const orderItemColumn = columns.find((item) => item.name === 'order_item_id');
    const hasAdjustmentItemColumn = columns.some((item) => item.name === 'adjustment_item_id');

    if (hasAdjustmentItemColumn && orderItemColumn && orderItemColumn.notnull === 0) return;

    database.pragma('foreign_keys = OFF');
    try {
        database.exec(`
            DROP TABLE IF EXISTS order_inventory_items_new;

            CREATE TABLE order_inventory_items_new
            (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
                order_item_id INTEGER REFERENCES sales_order_items(id) ON DELETE CASCADE,
                adjustment_item_id INTEGER REFERENCES sales_order_adjustment_items(id) ON DELETE CASCADE,
                inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
                cost_price_cents INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CHECK (
                    (order_item_id IS NOT NULL AND adjustment_item_id IS NULL)
                    OR
                    (order_item_id IS NULL AND adjustment_item_id IS NOT NULL)
                )
            );

            INSERT INTO order_inventory_items_new (
                id, order_id, order_item_id, adjustment_item_id,
                inventory_item_id, cost_price_cents, created_at
            )
            SELECT
                id, order_id, order_item_id, NULL,
                inventory_item_id, cost_price_cents, created_at
            FROM order_inventory_items;

            DROP TABLE order_inventory_items;
            ALTER TABLE order_inventory_items_new RENAME TO order_inventory_items;
        `);
    } finally {
        database.pragma('foreign_keys = ON');
    }
};

const runCompatMigrations = (database: Database.Database) => {
    ensureAdminUsersTable(database);
    ensureCustomersTable(database);
    ensureColumn(database, 'products', 'barcode', 'TEXT');
    ensureColumn(database, 'sales_orders', 'customer_id', 'INTEGER REFERENCES customers (id)');
    ensureColumn(database, 'sales_orders', 'is_paid', 'INTEGER NOT NULL DEFAULT 0');
    ensureColumn(database, 'sales_orders', 'created_by_user_id', 'INTEGER');
    ensureColumn(database, 'sales_orders', 'created_by_username', 'TEXT');
    ensureColumn(database, 'sales_orders', 'latest_adjustment_id', 'INTEGER');
    ensureSalesOrderAdjustmentTables(database);
    ensureOrderInventoryAdjustmentBinding(database);
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
    database.exec(
        'CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_id ON sales_orders(customer_id)'
    );
    if (addedInboundSource || addedInboundPurchaseOrder) {
        migrateLegacyInboundOrders(database);
    }
    ensureDefaultSuperAdmin(database);
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
