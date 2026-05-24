import { getDb } from '../lib/db';
import { toCents } from '../lib/db/serializers';

type ProductSeed = {
    category: string;
    name: string;
    referencePrice: number;
    sellingPrice?: number;
    usePremium?: boolean;
};

type ProductRecord = ProductSeed & { id: number };

const now = new Date();

const addDays = (date: Date, days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next.toISOString();
};

const addMonths = (date: Date, months: number) => {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next.toISOString();
};

const pick = <T>(items: readonly T[], index: number) => items[index % items.length];

const resetBusinessTables = (db: ReturnType<typeof getDb>) => {
    const tables = [
        'order_inventory_items',
        'sales_order_items',
        'sales_orders',
        'inventory_items',
        'inbound_order_items',
        'inbound_orders',
        'package_items',
        'packages',
        'operating_costs',
        'products',
        'suppliers',
    ];

    for (const table of tables) {
        db.prepare(`DELETE FROM ${table}`).run();
    }

    db.prepare(
        `DELETE FROM sqlite_sequence WHERE name IN (${tables.map(() => '?').join(',')})`
    ).run(...tables);
};

const seedPricingConfig = (db: ReturnType<typeof getDb>) => {
    db.prepare('DELETE FROM pricing_config').run();
    db.prepare(
        `
        INSERT INTO pricing_config (
            unified_pricing, unified_rate, rounding_type,
            cpu_rate, motherboard_rate, ram_rate, gpu_rate, storage_rate,
            psu_rate, case_rate, cooling_rate, monitor_rate, updated_at
        )
        VALUES (0, 12, 'ten', 10, 11, 14, 9, 16, 12, 18, 15, 8, CURRENT_TIMESTAMP)
    `
    ).run();
};

const supplierSeeds = [
    ['深圳华强北一号仓', '陈经理', '13800010001', '深圳市福田区华强北路 88 号'],
    ['广州粤海数码批发', '林小姐', '13800010002', '广州市天河区石牌西路 19 号'],
    ['上海浦东装机配件', '王总', '13800010003', '上海市浦东新区张江路 66 号'],
    ['北京中关村渠道商', '赵经理', '13800010004', '北京市海淀区中关村大街 27 号'],
    ['杭州云栖硬件仓', '孙先生', '13800010005', '杭州市西湖区文三路 168 号'],
    ['成都西南电竞供应', '刘经理', '13800010006', '成都市武侯区人民南路 4 段'],
] as const;

const productSeeds: ProductSeed[] = [
    ...[
        ['Intel i5-13400F 盒装', 1180],
        ['Intel i5-14600KF 散片', 1780],
        ['Intel i7-14700F 盒装', 2520],
        ['AMD Ryzen 5 7500F 散片', 1050],
        ['AMD Ryzen 7 7800X3D 盒装', 2690],
        ['AMD Ryzen 9 7900X 盒装', 2880],
    ].map(([name, price]) => ({
        category: 'cpu',
        name: String(name),
        referencePrice: Number(price),
    })),
    ...[
        ['华硕 B760M-AYW WIFI D4', 760],
        ['微星 B760M MORTAR WIFI II', 1190],
        ['技嘉 B650M AORUS ELITE AX', 1080],
        ['华硕 TUF B650M-PLUS WIFI', 1320],
        ['微星 Z790 EDGE TI MAX WIFI', 2490],
    ].map(([name, price]) => ({
        category: 'motherboard',
        name: String(name),
        referencePrice: Number(price),
    })),
    ...[
        ['金士顿 Fury DDR4 3200 16G', 245],
        ['光威天策 DDR4 3600 16Gx2', 429],
        ['金百达 银爵 DDR5 6000 16Gx2', 639],
        ['芝奇 幻锋戟 DDR5 6400 16Gx2', 899],
        ['海盗船 复仇者 DDR5 6000 32Gx2', 1299],
    ].map(([name, price]) => ({
        category: 'ram',
        name: String(name),
        referencePrice: Number(price),
    })),
    ...[
        ['七彩虹 RTX 4060 战斧 8G', 2199],
        ['影驰 RTX 4060 Ti 金属大师 8G', 2999],
        ['华硕 RTX 4070 SUPER 巨齿鲨', 4899],
        ['微星 RTX 4070 Ti SUPER 魔龙', 6499],
        ['蓝宝石 RX 7800 XT 白金版', 3599],
        ['撼讯 RX 7900 GRE 暗黑犬', 4099],
    ].map(([name, price]) => ({
        category: 'gpu',
        name: String(name),
        referencePrice: Number(price),
    })),
    ...[
        ['铠侠 RC20 1TB NVMe', 389],
        ['西数 SN770 1TB NVMe', 459],
        ['三星 990 EVO 1TB', 599],
        ['致态 TiPlus7100 2TB', 899],
        ['希捷酷鱼 4TB 机械盘', 529],
    ].map(([name, price]) => ({
        category: 'storage',
        name: String(name),
        referencePrice: Number(price),
    })),
    ...[
        ['长城 额定 650W 金牌', 389],
        ['航嘉 MVP K750 金牌', 529],
        ['海韵 FOCUS GX850 金牌', 899],
        ['振华 LEADEX 1000W 金牌', 1099],
    ].map(([name, price]) => ({
        category: 'psu',
        name: String(name),
        referencePrice: Number(price),
    })),
    ...[
        ['先马 平头哥 M2 玻璃侧透', 169],
        ['乔思伯 D31 MESH 副屏版', 429],
        ['追风者 XT523A 黑色', 329],
        ['联力 包豪斯 O11D EVO', 899],
    ].map(([name, price]) => ({
        category: 'case',
        name: String(name),
        referencePrice: Number(price),
    })),
    ...[
        ['利民 AX120 R SE', 69],
        ['九州风神 冰立方 AK400', 129],
        ['瓦尔基里 A360 一体水冷', 599],
        ['利民 Frozen Warframe 360', 699],
    ].map(([name, price]) => ({
        category: 'cooling',
        name: String(name),
        referencePrice: Number(price),
    })),
    ...[
        ['AOC 24G2SP 165Hz', 899],
        ['HKC VG273QK 2K 165Hz', 1199],
        ['LG 27GR75Q 2K 180Hz', 1499],
        ['三星 Odyssey G5 32 英寸', 1799],
    ].map(([name, price]) => ({
        category: 'monitor',
        name: String(name),
        referencePrice: Number(price),
    })),
];

const seedSuppliers = (db: ReturnType<typeof getDb>) => {
    const insert = db.prepare(
        `
        INSERT INTO suppliers (name, contact_name, phone, address, note, updated_at)
        VALUES (@name, @contact_name, @phone, @address, @note, CURRENT_TIMESTAMP)
    `
    );

    return supplierSeeds.map(([name, contactName, phone, address], index) => {
        const result = insert.run({
            name,
            contact_name: contactName,
            phone,
            address,
            note: `演示供应商 ${index + 1}`,
        });
        return Number(result.lastInsertRowid);
    });
};

const seedProducts = (db: ReturnType<typeof getDb>) => {
    const insert = db.prepare(
        `
        INSERT INTO products (
            category, name, price_cents, stock_quantity, selling_price_cents, is_use_premium, updated_at
        )
        VALUES (@category, @name, @price_cents, 0, @selling_price_cents, @is_use_premium, CURRENT_TIMESTAMP)
    `
    );

    return productSeeds.map((product, index) => {
        const manualSellingPrice = index % 9 === 0 ? product.referencePrice + 180 : null;
        const result = insert.run({
            category: product.category,
            name: product.name,
            price_cents: toCents(product.referencePrice),
            selling_price_cents: manualSellingPrice === null ? null : toCents(manualSellingPrice),
            is_use_premium: index % 9 === 0 ? 0 : 1,
        });

        return { ...product, id: Number(result.lastInsertRowid) };
    });
};

const seedInboundOrders = (
    db: ReturnType<typeof getDb>,
    products: ProductRecord[],
    supplierIds: number[]
) => {
    const orderInsert = db.prepare(
        `
        INSERT INTO inbound_orders (
            supplier_id, shipping_fee_cents, misc_fee_cents, is_paid, inbound_at, note, updated_at
        )
        VALUES (@supplier_id, @shipping_fee_cents, @misc_fee_cents, @is_paid, @inbound_at, @note, CURRENT_TIMESTAMP)
    `
    );
    const itemInsert = db.prepare(
        `
        INSERT INTO inbound_order_items (
            inbound_order_id, product_id, quantity, purchase_price_cents,
            warranty_enabled, warranty_until, note
        )
        VALUES (
            @inbound_order_id, @product_id, @quantity, @purchase_price_cents,
            @warranty_enabled, @warranty_until, @note
        )
    `
    );
    const inventoryInsert = db.prepare(
        `
        INSERT INTO inventory_items (
            product_id, supplier_id, inbound_order_id, inbound_order_item_id,
            cost_price_cents, serial_number, warranty_enabled, warranty_until,
            inbound_at, status, note, updated_at
        )
        VALUES (
            @product_id, @supplier_id, @inbound_order_id, @inbound_order_item_id,
            @cost_price_cents, @serial_number, @warranty_enabled, @warranty_until,
            @inbound_at, 'in_stock', @note, CURRENT_TIMESTAMP
        )
    `
    );

    const stockedProducts = products.slice(0, products.length - 8);
    for (let orderIndex = 0; orderIndex < 18; orderIndex += 1) {
        const supplierId = pick(supplierIds, orderIndex);
        const inboundAt = addDays(now, -42 + orderIndex * 2);
        const isPaid = orderIndex % 4 !== 0;
        const orderResult = orderInsert.run({
            supplier_id: supplierId,
            shipping_fee_cents: toCents(20 + (orderIndex % 6) * 12),
            misc_fee_cents: toCents(orderIndex % 3 === 0 ? 35 : 0),
            is_paid: isPaid ? 1 : 0,
            inbound_at: inboundAt,
            note: isPaid ? '演示入库单：已付款' : '演示入库单：用于账款管理待付',
        });
        const inboundOrderId = Number(orderResult.lastInsertRowid);
        const lineCount = 3 + (orderIndex % 4);

        for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
            const product = pick(stockedProducts, orderIndex * 5 + lineIndex * 3);
            const quantity = 1 + ((orderIndex + lineIndex) % 4);
            const purchasePrice = Math.max(
                30,
                product.referencePrice - 60 + ((orderIndex + lineIndex) % 5) * 35
            );
            const warrantyEnabled = (orderIndex + lineIndex) % 3 !== 0;
            const warrantyUntil = warrantyEnabled
                ? addMonths(now, 12 + ((orderIndex + lineIndex) % 3) * 12)
                : null;
            const itemResult = itemInsert.run({
                inbound_order_id: inboundOrderId,
                product_id: product.id,
                quantity,
                purchase_price_cents: toCents(purchasePrice),
                warranty_enabled: warrantyEnabled ? 1 : 0,
                warranty_until: warrantyUntil,
                note: `演示成本 ${purchasePrice}`,
            });
            const inboundOrderItemId = Number(itemResult.lastInsertRowid);

            for (let unitIndex = 0; unitIndex < quantity; unitIndex += 1) {
                const shouldHaveSerial = (orderIndex + lineIndex + unitIndex) % 2 === 0;
                inventoryInsert.run({
                    product_id: product.id,
                    supplier_id: supplierId,
                    inbound_order_id: inboundOrderId,
                    inbound_order_item_id: inboundOrderItemId,
                    cost_price_cents: toCents(purchasePrice),
                    serial_number: shouldHaveSerial
                        ? `DEMO-${String(product.id).padStart(3, '0')}-${orderIndex}-${lineIndex}-${unitIndex}`
                        : null,
                    warranty_enabled: warrantyEnabled ? 1 : 0,
                    warranty_until: warrantyUntil,
                    inbound_at: inboundAt,
                    note: '演示库存',
                });
            }
        }
    }
};

const seedPackages = (db: ReturnType<typeof getDb>, products: ProductRecord[]) => {
    const packageSeeds = [
        ['办公稳定主机', ['cpu', 'motherboard', 'ram', 'storage', 'psu', 'case']],
        [
            '网吧电竞 4060 方案',
            ['cpu', 'motherboard', 'ram', 'gpu', 'storage', 'psu', 'case', 'cooling'],
        ],
        ['设计剪辑高性能方案', ['cpu', 'motherboard', 'ram', 'gpu', 'storage', 'psu', 'cooling']],
        ['3A 游戏主机方案', ['cpu', 'motherboard', 'ram', 'gpu', 'storage', 'psu', 'case']],
        ['2K 高刷整机套装', ['cpu', 'motherboard', 'ram', 'gpu', 'storage', 'monitor']],
    ] as const;
    const insertPackage = db.prepare(
        'INSERT INTO packages (name, description, total_price_cents, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)'
    );
    const insertItem = db.prepare(
        'INSERT INTO package_items (package_id, product_id, quantity) VALUES (?, ?, ?)'
    );

    packageSeeds.forEach(([name, categories], seedIndex) => {
        const selected = categories.map((category, categoryIndex) => {
            const candidates = products.filter((product) => product.category === category);
            return pick(candidates, seedIndex + categoryIndex);
        });
        const total = selected.reduce((sum, product) => sum + toCents(product.referencePrice), 0);
        const result = insertPackage.run(name, `演示套餐：${name}`, total);
        const packageId = Number(result.lastInsertRowid);
        selected.forEach((product) =>
            insertItem.run(packageId, product.id, product.category === 'ram' ? 2 : 1)
        );
    });
};

const availableInventory = (db: ReturnType<typeof getDb>, productId: number, quantity: number) =>
    db
        .prepare(
            `
            SELECT id, cost_price_cents
            FROM inventory_items
            WHERE product_id = ? AND status = 'in_stock'
            ORDER BY cost_price_cents ASC, id ASC
            LIMIT ?
        `
        )
        .all(productId, quantity) as Array<{ id: number; cost_price_cents: number }>;

const seedSalesOrders = (db: ReturnType<typeof getDb>, products: ProductRecord[]) => {
    const orderInsert = db.prepare(
        `
        INSERT INTO sales_orders (
            order_no, customer_name, customer_phone, original_amount_cents, final_amount_cents,
            discount_amount_cents, cost_amount_cents, profit_amount_cents, status, is_paid,
            source, note, sold_at, created_at, updated_at
        )
        VALUES (
            @order_no, @customer_name, @customer_phone, @original_amount_cents, @final_amount_cents,
            @discount_amount_cents, @cost_amount_cents, @profit_amount_cents, @status, @is_paid,
            @source, @note, @sold_at, @created_at, CURRENT_TIMESTAMP
        )
    `
    );
    const itemInsert = db.prepare(
        `
        INSERT INTO sales_order_items (
            order_id, product_id, product_name, product_category, quantity, cost_price_cents, sale_price_cents
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    );
    const bindInventory = db.prepare(
        `
        INSERT INTO order_inventory_items (order_id, order_item_id, inventory_item_id, cost_price_cents)
        VALUES (?, ?, ?, ?)
    `
    );
    const markSold = db.prepare(
        "UPDATE inventory_items SET status = 'sold', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    );

    const customers = [
        ['张先生', '13910002001'],
        ['李女士', '13910002002'],
        ['王同学', '13910002003'],
        ['赵老板', '13910002004'],
        ['陈工程师', '13910002005'],
        ['刘小姐', '13910002006'],
        ['周先生', '13910002007'],
        ['孙女士', '13910002008'],
    ] as const;
    const selectableProducts = products.slice(0, products.length - 4);

    for (let orderIndex = 0; orderIndex < 26; orderIndex += 1) {
        const lineCount = 2 + (orderIndex % 5);
        const lines = Array.from({ length: lineCount }, (_, lineIndex) => {
            const product = pick(selectableProducts, orderIndex * 4 + lineIndex * 7);
            const quantity = lineIndex === 0 && orderIndex % 6 === 0 ? 2 : 1;
            const salePrice =
                Math.ceil((product.referencePrice * (1.12 + (lineIndex % 3) * 0.04)) / 10) * 10;
            return { product, quantity, salePrice };
        });

        const originalCents = lines.reduce(
            (sum, line) => sum + toCents(line.salePrice) * line.quantity,
            0
        );
        const finalCents = originalCents - toCents((orderIndex % 4) * 20);
        const status =
            orderIndex % 11 === 0 ? 'cancelled' : orderIndex % 3 === 0 ? 'completed' : 'pending';
        const isPaid = status === 'cancelled' ? 0 : orderIndex % 4 === 1 ? 0 : 1;
        const createdAt = addDays(now, -22 + orderIndex);
        const [customerName, customerPhone] = pick(customers, orderIndex);
        const orderResult = orderInsert.run({
            order_no: `DEMO${new Date(createdAt).toISOString().slice(0, 10).replace(/-/g, '')}${String(orderIndex + 1).padStart(4, '0')}`,
            customer_name: customerName,
            customer_phone: customerPhone,
            original_amount_cents: originalCents,
            final_amount_cents: finalCents,
            discount_amount_cents: originalCents - finalCents,
            cost_amount_cents: 0,
            profit_amount_cents: finalCents,
            status,
            is_paid: isPaid,
            source: orderIndex % 2 === 0 ? 'frontend' : 'manual',
            note: status === 'pending' ? '演示待结算订单' : '演示销售订单',
            sold_at: status === 'completed' ? createdAt : null,
            created_at: createdAt,
        });
        const orderId = Number(orderResult.lastInsertRowid);
        const bindings: Array<{
            orderItemId: number;
            inventoryId: number;
            costPriceCents: number;
        }> = [];

        for (const line of lines) {
            const inventoryRows =
                status === 'completed'
                    ? availableInventory(db, line.product.id, line.quantity)
                    : [];
            if (status === 'completed' && inventoryRows.length < line.quantity) continue;

            const itemResult = itemInsert.run(
                orderId,
                line.product.id,
                line.product.name,
                line.product.category,
                line.quantity,
                null,
                toCents(line.salePrice)
            );
            const orderItemId = Number(itemResult.lastInsertRowid);
            inventoryRows.forEach((inventory) => {
                bindings.push({
                    orderItemId,
                    inventoryId: inventory.id,
                    costPriceCents: inventory.cost_price_cents,
                });
            });
        }

        let costCents = 0;
        bindings.forEach((binding) => {
            bindInventory.run(
                orderId,
                binding.orderItemId,
                binding.inventoryId,
                binding.costPriceCents
            );
            markSold.run(binding.inventoryId);
            costCents += binding.costPriceCents;
        });

        if (status === 'completed') {
            db.prepare(
                `
                UPDATE sales_orders
                SET cost_amount_cents = ?, profit_amount_cents = ?
                WHERE id = ?
            `
            ).run(costCents, finalCents - costCents, orderId);
        }
    }
};

const seedOperatingCosts = (db: ReturnType<typeof getDb>) => {
    const costs = [
        ['rent', '五月门店房租', 6800],
        ['salary', '五月装机师傅工资', 9200],
        ['salary', '五月销售提成预估', 3600],
        ['utilities', '五月水电费', 780],
        ['misc', '门店清洁及包装耗材', 420],
        ['shipping', '同城配送费用', 960],
        ['purchase_misc', '入库木架及搬运费', 530],
        ['rent', '六月门店房租', 6800],
        ['salary', '六月人工工资', 9600],
        ['utilities', '六月水电预缴', 820],
        ['misc', '售后检测工具采购', 1180],
    ] as const;
    const insert = db.prepare(
        `
        INSERT INTO operating_costs (type, name, amount_cents, cost_date, note, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `
    );

    costs.forEach(([type, name, amount], index) => {
        insert.run(
            type,
            name,
            toCents(amount),
            addDays(now, -28 + index * 3).slice(0, 10),
            '演示成本'
        );
    });
};

const recalculateStock = (db: ReturnType<typeof getDb>) => {
    const rows = db.prepare('SELECT id FROM products').all() as Array<{ id: number }>;
    const countStmt = db.prepare(
        "SELECT COUNT(*) AS count FROM inventory_items WHERE product_id = ? AND status = 'in_stock'"
    );
    const updateStmt = db.prepare(
        'UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );

    rows.forEach((row) => {
        const stock = countStmt.get(row.id) as { count: number };
        updateStmt.run(stock.count, row.id);
    });
};

const main = () => {
    const db = getDb();

    db.transaction(() => {
        resetBusinessTables(db);
        seedPricingConfig(db);
        const supplierIds = seedSuppliers(db);
        const products = seedProducts(db);
        seedInboundOrders(db, products, supplierIds);
        seedPackages(db, products);
        seedSalesOrders(db, products);
        seedOperatingCosts(db);
        recalculateStock(db);
    })();

    const summary = {
        products: (db.prepare('SELECT COUNT(*) AS count FROM products').get() as { count: number })
            .count,
        inventory: (
            db.prepare('SELECT COUNT(*) AS count FROM inventory_items').get() as { count: number }
        ).count,
        inStock: (
            db
                .prepare("SELECT COUNT(*) AS count FROM inventory_items WHERE status = 'in_stock'")
                .get() as {
                count: number;
            }
        ).count,
        inboundOrders: (
            db.prepare('SELECT COUNT(*) AS count FROM inbound_orders').get() as { count: number }
        ).count,
        salesOrders: (
            db.prepare('SELECT COUNT(*) AS count FROM sales_orders').get() as { count: number }
        ).count,
        payables: (
            db.prepare('SELECT COUNT(*) AS count FROM inbound_orders WHERE is_paid = 0').get() as {
                count: number;
            }
        ).count,
        receivables: (
            db
                .prepare(
                    "SELECT COUNT(*) AS count FROM sales_orders WHERE is_paid = 0 AND status != 'cancelled'"
                )
                .get() as {
                count: number;
            }
        ).count,
    };

    console.log('Demo data seeded successfully:', summary);
};

main();
