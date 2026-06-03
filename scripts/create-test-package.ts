import { getDb } from '../lib/db';
import { toCents, toYuan } from '../lib/db/serializers';

type PackageProduct = {
    id: number;
    category: string;
    name: string;
    price_cents: number;
};

const packageName = '测试装机套餐';

const fallbackProducts = [
    ['cpu', '测试 CPU i5-14400F', 1099],
    ['motherboard', '测试 B760M 主板', 699],
    ['ram', '测试 DDR5 16G 内存', 299],
    ['gpu', '测试 RTX 4060 显卡', 2199],
    ['storage', '测试 1TB NVMe 固态', 399],
    ['psu', '测试 650W 金牌电源', 359],
    ['case', '测试 MATX 机箱', 169],
    ['cooling', '测试 四热管散热器', 89],
] as const;

const packageCategories = fallbackProducts.map(([category]) => category);

const getProductsByCategory = (db: ReturnType<typeof getDb>) => {
    const products = db
        .prepare(
            `
            SELECT id, category, name, price_cents
            FROM products
            WHERE category IN (${packageCategories.map(() => '?').join(',')})
            ORDER BY category ASC, price_cents ASC, id ASC
        `
        )
        .all(...packageCategories) as PackageProduct[];

    return new Map(
        packageCategories.map((category) => [
            category,
            products.find((item) => item.category === category),
        ])
    );
};

const ensureFallbackProducts = (db: ReturnType<typeof getDb>) => {
    const productsByCategory = getProductsByCategory(db);
    const insertProduct = db.prepare(
        `
        INSERT INTO products (
            category, name, barcode, price_cents, stock_quantity,
            selling_price_cents, is_use_premium, updated_at
        )
        VALUES (
            @category, @name, @barcode, @price_cents, 0,
            NULL, 1, CURRENT_TIMESTAMP
        )
    `
    );

    fallbackProducts.forEach(([category, name, price], index) => {
        if (productsByCategory.get(category)) return;

        insertProduct.run({
            category,
            name,
            barcode: `TESTPKG${String(index + 1).padStart(5, '0')}`,
            price_cents: toCents(price),
        });
    });

    return getProductsByCategory(db);
};

const main = () => {
    const db = getDb();

    const createPackage = db.transaction(() => {
        const productsByCategory = ensureFallbackProducts(db);
        const selectedProducts = packageCategories.map((category) => {
            const product = productsByCategory.get(category);
            if (!product) throw new Error(`Missing product for category: ${category}`);
            return product;
        });

        db.prepare('DELETE FROM packages WHERE name = ?').run(packageName);

        const totalPriceCents = selectedProducts.reduce((sum, product) => {
            const quantity = product.category === 'ram' ? 2 : 1;
            return sum + product.price_cents * quantity;
        }, 0);
        const packageResult = db
            .prepare(
                `
                INSERT INTO packages (name, description, total_price_cents, updated_at)
                VALUES (@name, @description, @total_price_cents, CURRENT_TIMESTAMP)
            `
            )
            .run({
                name: packageName,
                description: '当前数据库结构下生成的测试套餐',
                total_price_cents: totalPriceCents,
            });
        const packageId = Number(packageResult.lastInsertRowid);
        const insertItem = db.prepare(
            'INSERT INTO package_items (package_id, product_id, quantity) VALUES (?, ?, ?)'
        );

        selectedProducts.forEach((product) => {
            insertItem.run(packageId, product.id, product.category === 'ram' ? 2 : 1);
        });

        return { packageId, totalPriceCents, itemCount: selectedProducts.length };
    });

    const result = createPackage();
    console.log('Test package created successfully:', {
        id: result.packageId,
        name: packageName,
        itemCount: result.itemCount,
        totalPrice: toYuan(result.totalPriceCents),
    });
};

main();
