import pool from '../lib/db';

async function createTestPackage() {
    const client = await pool.connect();

    try {
        console.log('开始创建测试套餐...');

        // 1. 查询现有产品
        const productsResult = await client.query(
            `SELECT id, category, name, price FROM products ORDER BY category, id`
        );

        if (productsResult.rows.length === 0) {
            console.log('数据库中没有产品数据，请先运行 npm run db:init');
            return;
        }

        console.log(`找到 ${productsResult.rows.length} 个产品`);

        // 2. 选择产品组成套餐（选择每个类别的第一个产品）
        const categories = [
            'cpu',
            'motherboard',
            'ram',
            'gpu',
            'storage',
            'psu',
            'case',
            'cooling',
        ];
        const selectedProducts: Array<{
            id: number;
            category: string;
            name: string;
            price: number;
        }> = [];

        for (const category of categories) {
            const product = productsResult.rows.find((p) => p.category === category);
            if (product) {
                selectedProducts.push(product);
            }
        }

        console.log(
            '选择的产品:',
            selectedProducts.map((p) => `${p.category}: ${p.name}`)
        );

        // 3. 计算总价
        const totalPrice = selectedProducts.reduce((sum, p) => sum + parseFloat(p.price), 0);
        console.log(`套餐总价: $${totalPrice.toFixed(2)}`);

        // 4. 开始事务创建套餐
        await client.query('BEGIN');

        // 创建套餐
        const packageResult = await client.query(
            `INSERT INTO packages (name, description, total_price)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [
                '高性能游戏主机套餐',
                '适合3A大作和高帧率游戏的旗舰级配置，包含顶级CPU、显卡和主板，性能强劲',
                totalPrice,
            ]
        );

        const packageId = packageResult.rows[0].id;
        console.log(`套餐创建成功，ID: ${packageId}`);

        // 添加套餐配件
        for (const product of selectedProducts) {
            await client.query(
                `INSERT INTO package_items (package_id, product_id, quantity)
                 VALUES ($1, $2, $3)`,
                [packageId, product.id, 1]
            );
        }

        console.log('套餐配件添加完成');

        await client.query('COMMIT');

        console.log('\n✅ 测试套餐创建成功！');
        console.log('\n套餐信息:');
        console.log('- 名称: 高性能游戏主机套餐');
        console.log('- 描述: 适合3A大作和高帧率游戏的旗舰级配置');
        console.log(`- 总价: $${totalPrice.toFixed(2)}`);
        console.log(`- 配件数量: ${selectedProducts.length}`);
        console.log('\n访问 http://localhost:3000/admin/dashboard/packages 查看效果');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('创建测试套餐失败:', error);
        throw error;
    } finally {
        client.release();
    }
}

// 如果直接运行此文件
if (require.main === module) {
    createTestPackage()
        .then(() => {
            console.log('\n完成!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('失败:', error);
            process.exit(1);
        });
}

export default createTestPackage;
