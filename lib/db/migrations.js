/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('fs');

const DEFAULT_SUPER_ADMIN_USERNAME = 'yangshuhao';
const DEFAULT_SUPER_ADMIN_PASSWORD_HASH =
    '$2b$10$yHX3j6jCJJK3QBNk.ATf2uwHvYq1eZLGx8qIdGVQHqiho6xL2PJsG';

const CATEGORY_TAG_COLORS = [
    'blue',
    'green',
    'purple',
    'orange',
    'cyan',
    'magenta',
    'gold',
    'red',
    'lime',
    'geekblue',
    'volcano',
];

const DEFAULT_PRODUCT_CATEGORIES = [
    { code: 'cpu', name: '处理器', label: 'CPU(处理器)', tag_color: 'blue' },
    { code: 'motherboard', name: '主板', label: 'Motherboard(主板)', tag_color: 'purple' },
    { code: 'ram', name: '内存', label: 'RAM(内存)', tag_color: 'green' },
    { code: 'gpu', name: '显卡', label: 'GPU(显卡)', tag_color: 'red' },
    { code: 'storage', name: '存储', label: 'Storage(存储)', tag_color: 'gold' },
    { code: 'psu', name: '电源', label: 'PSU(电源)', tag_color: 'orange' },
    { code: 'case', name: '机箱', label: 'Case(机箱)', tag_color: 'geekblue' },
    { code: 'cooling', name: '散热', label: 'Cooling(散热)', tag_color: 'cyan' },
    { code: 'monitor', name: '显示器', label: 'Monitor(显示器)', tag_color: 'magenta' },
];

const LEGACY_PRICING_RATE_COLUMNS = {
    cpu: 'cpu_rate',
    motherboard: 'motherboard_rate',
    ram: 'ram_rate',
    gpu: 'gpu_rate',
    storage: 'storage_rate',
    psu: 'psu_rate',
    case: 'case_rate',
    cooling: 'cooling_rate',
    monitor: 'monitor_rate',
};

const DEFAULT_AFTER_SALES_CATEGORIES = [
    { code: 'diagnosis_system', name: '检测/系统', description: '电脑检测、系统安装、验机与桌面优化' },
    { code: 'cleaning', name: '清洁保养', description: '笔记本、台式机、键盘等清洁维护服务' },
    { code: 'hardware', name: '装机/硬件服务', description: '理线、拆机、硬件加装与代装机服务' },
    { code: 'software', name: '软件服务', description: '专业软件安装与个人软件终身服务' },
    { code: 'onsite', name: '上门服务', description: '到店外上门处理相关服务' },
];

const DEFAULT_AFTER_SALES_SERVICES = [
    {
        code: 'hardware_detection',
        category_code: 'diagnosis_system',
        name: '电脑软硬件问题检测',
        price_type: 'fixed',
        price_cents: 3000,
        price_label: '30元',
    },
    {
        code: 'password_clear_keep_data',
        category_code: 'diagnosis_system',
        name: '电脑密码清除（不清资料）',
        price_type: 'fixed',
        price_cents: 3000,
        price_label: '30元',
    },
    {
        code: 'system_reinstall_simple',
        category_code: 'diagnosis_system',
        name: '电脑系统安装/重装服务（简装）',
        price_type: 'fixed',
        price_cents: 3000,
        price_label: '30元',
    },
    {
        code: 'system_reinstall_full',
        category_code: 'diagnosis_system',
        name: '电脑系统安装/重装服务（精装）',
        description: '一对一品牌针对性专业安装驱动软件调试，笔记本优先选择',
        price_type: 'fixed',
        price_cents: 5900,
        price_label: '59元',
        is_featured: 1,
    },
    {
        code: 'new_machine_check',
        category_code: 'diagnosis_system',
        name: '台式机/笔记本新机验机',
        description: '包含系统开荒、正品检测、功能测试、硬盘分区等',
        price_type: 'fixed',
        price_cents: 5000,
        price_label: '50元',
    },
    {
        code: 'windows_desktop_beautify',
        category_code: 'diagnosis_system',
        name: 'WIN10/WIN11 系统桌面美化',
        price_type: 'fixed',
        price_cents: 6900,
        price_label: '69元',
    },
    {
        code: 'laptop_cleaning_grease',
        category_code: 'cleaning',
        name: '笔记本电脑清洁（带换硅脂）',
        description: '本服务赠送免费原装硅脂，如需高性能硅脂可另外购买',
        price_type: 'fixed',
        price_cents: 8000,
        price_label: '80元',
    },
    {
        code: 'laptop_deep_cleaning',
        category_code: 'cleaning',
        name: '笔记本电脑深度清洁',
        includes: '包含屏幕清洁、外观清洁、主板清洁、风道堵塞疏通、更换硅脂等',
        price_type: 'fixed',
        price_cents: 29900,
        price_label: '299元',
        is_featured: 1,
    },
    {
        code: 'desktop_deep_cleaning',
        category_code: 'cleaning',
        name: '台式电脑深度清洁',
        description: '整机零件全部拆除清洁，包含理线等服务，时间需要两个小时左右',
        price_type: 'fixed',
        price_cents: 29900,
        price_label: '299元',
    },
    {
        code: 'keyboard_deep_cleaning',
        category_code: 'cleaning',
        name: '键盘深度清洁（小/大）',
        price_type: 'multi',
        price_cents: null,
        price_label: '99元/139元',
    },
    {
        code: 'desktop_cable_simple',
        category_code: 'hardware',
        name: '台式电脑理线布局规整（简约）',
        price_type: 'fixed',
        price_cents: 5900,
        price_label: '59元',
    },
    {
        code: 'desktop_cable_full',
        category_code: 'hardware',
        name: '台式电脑理线布局规整（精装）',
        price_type: 'fixed',
        price_cents: 19900,
        price_label: '199元',
    },
    {
        code: 'laptop_hardware_upgrade',
        category_code: 'hardware',
        name: '笔记本加装硬盘/内存服务费',
        price_type: 'fixed',
        price_cents: 5000,
        price_label: '50元',
    },
    {
        code: 'desktop_disassembly',
        category_code: 'hardware',
        name: '台式机拆机',
        price_type: 'fixed',
        price_cents: 8000,
        price_label: '80元',
    },
    {
        code: 'desktop_build_service',
        category_code: 'hardware',
        name: '台式机代装机：风冷/水冷/海景房满风扇',
        price_type: 'multi',
        price_cents: null,
        price_label: '120元/150元/200元',
        is_featured: 1,
    },
    {
        code: 'professional_software_install',
        category_code: 'software',
        name: '专业软件安装 单个/全套',
        description: 'PS、PR、AI、AU、CAD 等专业软件安装单个 10 元，全套终身服务，随时可远程安装',
        price_type: 'multi',
        price_cents: null,
        price_label: '10元/159元',
    },
    {
        code: 'personal_software_lifetime',
        category_code: 'software',
        name: '个人软件终身服务',
        description: '包含所有软件服务，重装系统、专业软件安装（全套）等个人终身服务',
        price_type: 'fixed',
        price_cents: 89900,
        price_label: '899元',
        is_featured: 1,
    },
    {
        code: 'onsite_service_fee',
        category_code: 'onsite',
        name: '上门服务费（不含维修）：市区/东区/乡镇',
        price_type: 'multi',
        price_cents: null,
        price_label: '50元/80元/120元',
    },
];

const DEFAULT_AFTER_SALES_NOTICES = [
    {
        code: 'backup_notice',
        content:
            '对于所有需要清理硬盘的服务，重要数据请提前备份，我们对您的数据不负有保管责任，如若数据丢失，本店概不负责。',
    },
    {
        code: 'cleaning_notice',
        content:
            '笔记本清灰属正常保养服务，不会对您的电脑造成任何损坏，且不会影响后续原厂保修服务。清灰过程中本店监控全程记录，如清灰完成离店后电脑出现任何硬件问题，本店概不负责，感谢您的理解。',
    },
    {
        code: 'legacy_machine_notice',
        content: '对于年代久远、无配件的老机器可能无法维修。',
    },
    {
        code: 'parts_fee_notice',
        content: '本报价仅含各项目服务费，不含配件费，配件价格随市场波动，实报实销。',
    },
];

const ensureColumn = (database, table, column, definition) => {
    const columns = database.prepare(`PRAGMA table_info(${table})`).all();
    if (columns.some((item) => item.name === column)) return false;

    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    return true;
};

const migrateLegacyInboundOrders = (database) => {
    const legacyOrders = database
        .prepare(
            `
            SELECT *
            FROM inbound_orders
            WHERE purchase_order_id IS NULL
        `
        )
        .all();

    if (legacyOrders.length === 0) return;

    const migrate = database.transaction(() => {
        const insertPurchaseOrder = database.prepare(
            `
            INSERT INTO purchase_orders (
                supplier_id, status, ordered_at, expected_inbound_at,
                shipping_fee_cents, misc_fee_cents, note, updated_at
            )
            VALUES (
                @supplier_id, 'inbound', @ordered_at, NULL,
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
            const items = itemsStmt.all(order.id);
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

const ensureAdminUsersTable = (database) => {
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

const ensureDefaultSuperAdmin = (database) => {
    const existing = database
        .prepare('SELECT id FROM admin_users WHERE username = ?')
        .get(DEFAULT_SUPER_ADMIN_USERNAME);

    if (!existing) {
        database
            .prepare(
                `
                INSERT INTO admin_users (username, password_hash, role, status, updated_at)
                VALUES (@username, @password_hash, 'admin', 'active', CURRENT_TIMESTAMP)
            `
            )
            .run({
                username: DEFAULT_SUPER_ADMIN_USERNAME,
                password_hash: DEFAULT_SUPER_ADMIN_PASSWORD_HASH,
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

const ensureCustomersTable = (database) => {
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

const ensureProductCategoryTables = (database) => {
    database.exec(`
        CREATE TABLE IF NOT EXISTS product_categories
        (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE,
            name TEXT NOT NULL,
            label TEXT NOT NULL,
            tag_color TEXT NOT NULL DEFAULT 'blue',
            sort_order INTEGER NOT NULL DEFAULT 0,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_product_categories_active_sort
            ON product_categories(is_active, sort_order);

        CREATE TABLE IF NOT EXISTS category_pricing_rates
        (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL UNIQUE REFERENCES product_categories(id),
            rate REAL NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    `);
};

const ensureAfterSalesServiceTables = (database) => {
    database.exec(`
        CREATE TABLE IF NOT EXISTS after_sales_service_categories
        (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE,
            name TEXT NOT NULL CHECK (name <> ''),
            description TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_after_sales_categories_active_sort
            ON after_sales_service_categories(is_active, sort_order);

        CREATE TABLE IF NOT EXISTS after_sales_services
        (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE,
            category_id INTEGER NOT NULL REFERENCES after_sales_service_categories(id),
            name TEXT NOT NULL CHECK (name <> ''),
            description TEXT,
            price_type TEXT NOT NULL DEFAULT 'fixed'
                CHECK (price_type IN ('fixed', 'range', 'multi', 'custom')),
            price_cents INTEGER CHECK (price_cents IS NULL OR price_cents >= 0),
            price_label TEXT NOT NULL DEFAULT '',
            unit TEXT,
            includes TEXT,
            excludes TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            is_featured INTEGER NOT NULL DEFAULT 0,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_after_sales_services_category_sort
            ON after_sales_services(category_id, is_active, sort_order);

        CREATE TABLE IF NOT EXISTS after_sales_service_notices
        (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE,
            content TEXT NOT NULL CHECK (content <> ''),
            sort_order INTEGER NOT NULL DEFAULT 0,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_after_sales_notices_active_sort
            ON after_sales_service_notices(is_active, sort_order);
    `);
};

const seedDefaultAfterSalesServices = (database) => {
    const insertCategory = database.prepare(`
        INSERT OR IGNORE INTO after_sales_service_categories (
            code, name, description, sort_order, is_active, updated_at
        )
        VALUES (
            @code, @name, @description, @sort_order, 1, CURRENT_TIMESTAMP
        )
    `);
    const getCategory = database.prepare(
        'SELECT id FROM after_sales_service_categories WHERE code = ?'
    );
    const insertService = database.prepare(`
        INSERT OR IGNORE INTO after_sales_services (
            code, category_id, name, description, price_type, price_cents, price_label,
            unit, includes, excludes, sort_order, is_featured, is_active, updated_at
        )
        VALUES (
            @code, @category_id, @name, @description, @price_type, @price_cents, @price_label,
            @unit, @includes, @excludes, @sort_order, @is_featured, 1, CURRENT_TIMESTAMP
        )
    `);
    const insertNotice = database.prepare(`
        INSERT OR IGNORE INTO after_sales_service_notices (
            code, content, sort_order, is_active, updated_at
        )
        VALUES (
            @code, @content, @sort_order, 1, CURRENT_TIMESTAMP
        )
    `);

    const seed = database.transaction(() => {
        DEFAULT_AFTER_SALES_CATEGORIES.forEach((category, index) => {
            insertCategory.run({
                ...category,
                description: category.description || null,
                sort_order: (index + 1) * 10,
            });
        });

        const serviceSortByCategory = new Map();
        DEFAULT_AFTER_SALES_SERVICES.forEach((service) => {
            const category = getCategory.get(service.category_code);
            if (!category) return;

            const nextSort = (serviceSortByCategory.get(service.category_code) || 0) + 10;
            serviceSortByCategory.set(service.category_code, nextSort);

            insertService.run({
                code: service.code,
                category_id: category.id,
                name: service.name,
                description: service.description || null,
                price_type: service.price_type,
                price_cents: service.price_cents ?? null,
                price_label: service.price_label,
                unit: service.unit || null,
                includes: service.includes || null,
                excludes: service.excludes || null,
                sort_order: nextSort,
                is_featured: service.is_featured ? 1 : 0,
            });
        });

        DEFAULT_AFTER_SALES_NOTICES.forEach((notice, index) => {
            insertNotice.run({
                ...notice,
                sort_order: (index + 1) * 10,
            });
        });
    });

    seed();
};

const ensureAfterSalesServiceInfrastructure = (database) => {
    ensureAfterSalesServiceTables(database);
    seedDefaultAfterSalesServices(database);
};

const normalizePurchaseAndReturnWorkflow = (database) => {
    ensureColumn(
        database,
        'purchase_returns',
        'goods_status',
        "TEXT NOT NULL DEFAULT 'pending_shipment'"
    );
    ensureColumn(database, 'purchase_returns', 'shipping_fee_cents', 'INTEGER NOT NULL DEFAULT 0');
    ensureColumn(
        database,
        'purchase_returns',
        'shipping_fee_bearer',
        "TEXT NOT NULL DEFAULT 'self'"
    );
    ensureColumn(
        database,
        'purchase_returns',
        'self_shipping_fee_cents',
        'INTEGER NOT NULL DEFAULT 0'
    );
    ensureColumn(
        database,
        'purchase_returns',
        'merchant_shipping_fee_cents',
        'INTEGER NOT NULL DEFAULT 0'
    );
    ensureColumn(database, 'purchase_returns', 'logistics_company', 'TEXT');
    ensureColumn(database, 'purchase_returns', 'tracking_no', 'TEXT');
    ensureColumn(database, 'purchase_returns', 'shipped_at', 'TEXT');
    ensureColumn(database, 'purchase_returns', 'merchant_received_at', 'TEXT');
    ensureColumn(database, 'purchase_returns', 'cancelled_at', 'TEXT');
    ensureColumn(database, 'purchase_returns', 'cancel_reason', 'TEXT');
    ensureColumn(database, 'purchase_returns', 'note', 'TEXT');

    database.exec(`
        UPDATE purchase_orders
        SET status = 'inbound',
            updated_at = CURRENT_TIMESTAMP
        WHERE status = 'completed';

        UPDATE purchase_returns
        SET goods_status = 'merchant_received',
            merchant_received_at = COALESCE(merchant_received_at, updated_at, created_at),
            updated_at = CURRENT_TIMESTAMP
        WHERE status = 'completed'
          AND goods_status = 'pending_shipment';

        CREATE INDEX IF NOT EXISTS idx_purchase_returns_inbound_id
            ON purchase_returns(inbound_order_id);
        CREATE INDEX IF NOT EXISTS idx_purchase_returns_goods_status
            ON purchase_returns(goods_status);
        CREATE INDEX IF NOT EXISTS idx_purchase_refunds_return_status
            ON purchase_refunds(purchase_return_id, status);
    `);
};

const ensureDefaultProductCategories = (database) => {
    const insert = database.prepare(`
        INSERT OR IGNORE INTO product_categories (
            code, name, label, tag_color, sort_order, is_active, updated_at
        )
        VALUES (
            @code, @name, @label, @tag_color, @sort_order, 1, CURRENT_TIMESTAMP
        )
    `);

    DEFAULT_PRODUCT_CATEGORIES.forEach((category, index) => {
        insert.run({
            ...category,
            sort_order: (index + 1) * 10,
        });
    });
};

const ensureCategoriesForLegacyProducts = (database) => {
    const rows = database
        .prepare(
            `
            SELECT DISTINCT category
            FROM products
            WHERE category IS NOT NULL
              AND category <> ''
              AND category NOT IN (SELECT code FROM product_categories WHERE code IS NOT NULL)
            ORDER BY category ASC
        `
        )
        .all();

    if (rows.length === 0) return;

    const maxSortRow = database
        .prepare('SELECT COALESCE(MAX(sort_order), 0) AS max_sort FROM product_categories')
        .get();
    let sortOrder = Number(maxSortRow?.max_sort || 0);
    const insert = database.prepare(`
        INSERT OR IGNORE INTO product_categories (
            code, name, label, tag_color, sort_order, is_active, updated_at
        )
        VALUES (
            @code, @name, @label, @tag_color, @sort_order, 1, CURRENT_TIMESTAMP
        )
    `);

    rows.forEach((row, index) => {
        const code = String(row.category || '').trim();
        if (!code) return;
        sortOrder += 10;
        insert.run({
            code,
            name: code,
            label: code,
            tag_color: CATEGORY_TAG_COLORS[index % CATEGORY_TAG_COLORS.length],
            sort_order: sortOrder,
        });
    });
};

const backfillProductCategoryIds = (database) => {
    database.exec(`
        UPDATE products
        SET category_id = (
            SELECT pc.id
            FROM product_categories pc
            WHERE pc.code = products.category
        )
        WHERE category_id IS NULL
          AND category IS NOT NULL
          AND category <> ''
          AND EXISTS (
              SELECT 1
              FROM product_categories pc
              WHERE pc.code = products.category
          );
    `);
};

const migrateLegacyPricingRates = (database) => {
    const row = database.prepare('SELECT * FROM pricing_config ORDER BY id DESC LIMIT 1').get();
    if (!row) return;

    const insert = database.prepare(`
        INSERT OR IGNORE INTO category_pricing_rates (
            category_id, rate, updated_at
        )
        SELECT id, @rate, CURRENT_TIMESTAMP
        FROM product_categories
        WHERE code = @code
    `);

    Object.entries(LEGACY_PRICING_RATE_COLUMNS).forEach(([code, column]) => {
        insert.run({
            code,
            rate: Number(row[column] || 0),
        });
    });
};

const ensureProductCategoryInfrastructure = (database) => {
    ensureProductCategoryTables(database);
    ensureColumn(database, 'products', 'category_id', 'INTEGER REFERENCES product_categories(id)');
    database.exec('CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)');
    ensureDefaultProductCategories(database);
    ensureCategoriesForLegacyProducts(database);
    backfillProductCategoryIds(database);
    migrateLegacyPricingRates(database);
};

const ensureLogisticsInfrastructure = (database) => {
    database.exec(`
        CREATE TABLE IF NOT EXISTS logistics_companies
        (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            contact TEXT,
            note TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_logistics_companies_status
            ON logistics_companies(status);

        CREATE TABLE IF NOT EXISTS logistics_records
        (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL DEFAULT 'manual',
            company_id INTEGER REFERENCES logistics_companies (id),
            tracking_no TEXT,
            shipping_fee_cents INTEGER NOT NULL DEFAULT 0,
            self_amount_cents INTEGER NOT NULL DEFAULT 0,
            occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            related_type TEXT,
            related_id INTEGER,
            shipping_fee_bearer TEXT NOT NULL DEFAULT 'self',
            settlement_target TEXT NOT NULL DEFAULT 'logistics_company',
            payment_status TEXT NOT NULL DEFAULT 'unpaid',
            paid_at TEXT,
            payment_account TEXT,
            note TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_logistics_records_company_status
            ON logistics_records(company_id, payment_status);
        CREATE INDEX IF NOT EXISTS idx_logistics_records_type_time
            ON logistics_records(type, occurred_at);
        CREATE INDEX IF NOT EXISTS idx_logistics_records_related
            ON logistics_records(related_type, related_id);
    `);
};

const ensureLogisticsBusinessIntegration = (database) => {
    ensureColumn(
        database,
        'purchase_returns',
        'logistics_company_id',
        'INTEGER REFERENCES logistics_companies (id)'
    );
    database.exec(`
        CREATE INDEX IF NOT EXISTS idx_purchase_returns_logistics_company_id
            ON purchase_returns(logistics_company_id);
    `);
};

const ensureSalesOrderAdjustmentTables = (database) => {
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

const ensureOrderInventoryAdjustmentBinding = (database) => {
    const columns = database.prepare('PRAGMA table_info(order_inventory_items)').all();
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

const ensureSalesOrderPaymentDeliveryStatuses = (database) => {
    const addedPaymentStatus = ensureColumn(
        database,
        'sales_orders',
        'payment_status',
        "TEXT NOT NULL DEFAULT 'unpaid'"
    );
    const addedDeliveryStatus = ensureColumn(
        database,
        'sales_orders',
        'delivery_status',
        "TEXT NOT NULL DEFAULT 'undelivered'"
    );
    ensureColumn(database, 'sales_orders', 'delivered_at', 'TEXT');
    ensureColumn(database, 'sales_orders', 'cancelled_at', 'TEXT');
    ensureColumn(database, 'sales_orders', 'cancelled_by_user_id', 'INTEGER');
    ensureColumn(database, 'sales_orders', 'cancelled_by_username', 'TEXT');
    ensureColumn(database, 'sales_orders', 'cancel_reason', 'TEXT');
    ensureColumn(database, 'sales_orders', 'refunded_at', 'TEXT');
    ensureColumn(database, 'sales_orders', 'refunded_by_user_id', 'INTEGER');
    ensureColumn(database, 'sales_orders', 'refunded_by_username', 'TEXT');
    ensureColumn(database, 'sales_orders', 'refund_note', 'TEXT');

    database.exec(`
        CREATE INDEX IF NOT EXISTS idx_sales_orders_payment_status
            ON sales_orders(payment_status);
        CREATE INDEX IF NOT EXISTS idx_sales_orders_delivery_status
            ON sales_orders(delivery_status);
    `);

    if (addedPaymentStatus || addedDeliveryStatus) {
        database.exec(`
            UPDATE sales_orders
            SET payment_status = CASE
                    WHEN status = 'cancelled' AND is_paid = 1 THEN 'refund_pending'
                    WHEN is_paid = 1 THEN 'paid'
                    ELSE 'unpaid'
                END,
                delivery_status = CASE
                    WHEN status = 'completed' THEN 'delivered'
                    WHEN status = 'cancelled' THEN 'cancelled'
                    ELSE 'undelivered'
                END,
                delivered_at = CASE
                    WHEN status = 'completed' THEN COALESCE(delivered_at, sold_at)
                    ELSE delivered_at
                END
        `);
    }
};

const migrations = [
    {
        id: '202606040001_admin_users',
        name: 'Ensure admin users table',
        up: ensureAdminUsersTable,
    },
    {
        id: '202606040002_customers',
        name: 'Ensure customers table',
        up: ensureCustomersTable,
    },
    {
        id: '202606040003_products_barcode',
        name: 'Add product barcode',
        up: (database) => {
            ensureColumn(database, 'products', 'barcode', 'TEXT');
            database.exec(
                "CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL AND barcode <> ''"
            );
        },
    },
    {
        id: '202606040004_sales_order_customer_payment_adjustments',
        name: 'Add sales order customer and adjustment columns',
        up: (database) => {
            ensureColumn(
                database,
                'sales_orders',
                'customer_id',
                'INTEGER REFERENCES customers (id)'
            );
            ensureColumn(database, 'sales_orders', 'is_paid', 'INTEGER NOT NULL DEFAULT 0');
            ensureColumn(database, 'sales_orders', 'created_by_user_id', 'INTEGER');
            ensureColumn(database, 'sales_orders', 'created_by_username', 'TEXT');
            ensureColumn(database, 'sales_orders', 'latest_adjustment_id', 'INTEGER');
            database.exec(
                'CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_id ON sales_orders(customer_id)'
            );
        },
    },
    {
        id: '202606040005_sales_order_adjustments',
        name: 'Ensure sales order adjustment tables',
        up: ensureSalesOrderAdjustmentTables,
    },
    {
        id: '202606040006_order_inventory_adjustment_binding',
        name: 'Allow order inventory binding to adjustment items',
        up: ensureOrderInventoryAdjustmentBinding,
    },
    {
        id: '202606040007_inbound_purchase_order_compat',
        name: 'Add purchase order source columns to inbound orders',
        up: (database) => {
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

            if (addedInboundSource || addedInboundPurchaseOrder) {
                migrateLegacyInboundOrders(database);
            }
        },
    },
    {
        id: '202606040008_inventory_serial_warranty',
        name: 'Add serial tracking and warranty columns',
        up: (database) => {
            ensureColumn(
                database,
                'inbound_order_items',
                'serial_tracking_enabled',
                'INTEGER NOT NULL DEFAULT 0'
            );
            ensureColumn(
                database,
                'inbound_order_items',
                'warranty_enabled',
                'INTEGER NOT NULL DEFAULT 0'
            );
            ensureColumn(database, 'inbound_order_items', 'warranty_until', 'TEXT');
            ensureColumn(
                database,
                'inventory_items',
                'warranty_enabled',
                'INTEGER NOT NULL DEFAULT 0'
            );
            ensureColumn(database, 'inventory_items', 'warranty_until', 'TEXT');
        },
    },
    {
        id: '202606040009_product_categories_dynamic_pricing',
        name: 'Add product categories and dynamic pricing rates',
        up: ensureProductCategoryInfrastructure,
    },
    {
        id: '202606070001_purchase_inbound_return_workflow',
        name: 'Normalize purchase inbound and return workflow',
        up: normalizePurchaseAndReturnWorkflow,
    },
    {
        id: '202606130001_logistics_management',
        name: 'Add logistics companies and records',
        up: ensureLogisticsInfrastructure,
    },
    {
        id: '202606130002_logistics_business_integration',
        name: 'Link logistics records to purchase workflows',
        up: ensureLogisticsBusinessIntegration,
    },
    {
        id: '202606140001_sales_order_payment_delivery_statuses',
        name: 'Add sales order payment and delivery statuses',
        up: ensureSalesOrderPaymentDeliveryStatuses,
    },
    {
        id: '202606140002_after_sales_services',
        name: 'Add after-sales service catalog',
        up: ensureAfterSalesServiceInfrastructure,
    },
];

const ensureMigrationsTable = (database) => {
    database.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations
        (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    `);
};

const runSqliteMigrations = (database, options = {}) => {
    ensureMigrationsTable(database);

    const logger = options.logger;
    const appliedRows = database.prepare('SELECT id FROM schema_migrations').all();
    const appliedIds = new Set(appliedRows.map((item) => item.id));
    const recordMigration = database.prepare(
        `
        INSERT INTO schema_migrations (id, name, applied_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
    `
    );
    const applied = [];
    const skipped = [];

    migrations.forEach((migration) => {
        if (appliedIds.has(migration.id)) {
            skipped.push(migration.id);
            return;
        }

        logger?.(`Applying SQLite migration ${migration.id} - ${migration.name}`);
        migration.up(database);
        recordMigration.run(migration.id, migration.name);
        applied.push(migration.id);
        appliedIds.add(migration.id);
    });

    ensureDefaultSuperAdmin(database);

    return { applied, skipped };
};

const initializeSqliteDatabase = (database, options = {}) => {
    database.pragma('busy_timeout = 5000');
    database.pragma('foreign_keys = ON');
    database.pragma('journal_mode = WAL');

    if (options.schemaPath) {
        const schema = fs.readFileSync(options.schemaPath, 'utf8');
        database.exec(schema);
    }

    return runSqliteMigrations(database, options);
};

module.exports = {
    initializeSqliteDatabase,
    runSqliteMigrations,
};
