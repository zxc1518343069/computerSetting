import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - 获取所有套餐
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');

        let query = `
            SELECT p.*,
                   json_agg(
                       json_build_object(
                           'id', pi.id,
                           'product_id', pi.product_id,
                           'quantity', pi.quantity,
                           'product_name', pr.name,
                           'product_price', pr.price,
                           'product_category', pr.category
                       )
                   ) FILTER (WHERE pi.id IS NOT NULL) as items
            FROM packages p
            LEFT JOIN package_items pi ON p.id = pi.package_id
            LEFT JOIN products pr ON pi.product_id = pr.id
        `;

        const params: string[] = [];

        if (search) {
            query += ' WHERE p.name ILIKE $1 OR p.description ILIKE $1';
            params.push(`%${search}%`);
        }

        query += ' GROUP BY p.id ORDER BY p.created_at DESC';

        const result = await pool.query(query, params);

        return NextResponse.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error('Get packages error:', error);
        return NextResponse.json({ error: '获取套餐列表失败' }, { status: 500 });
    }
}

// POST - 创建新套餐
export async function POST(request: NextRequest) {
    const client = await pool.connect();

    try {
        const { name, description, items } = await request.json();

        if (!name || !items || items.length === 0) {
            return NextResponse.json({ error: '套餐名称和配件不能为空' }, { status: 400 });
        }

        await client.query('BEGIN');

        // 计算总价
        let totalPrice = 0;
        for (const item of items) {
            const productResult = await client.query('SELECT price FROM products WHERE id = $1', [
                item.product_id,
            ]);
            if (productResult.rows.length > 0) {
                totalPrice += parseFloat(productResult.rows[0].price) * item.quantity;
            }
        }

        // 创建套餐
        const packageResult = await client.query(
            `INSERT INTO packages (name, description, total_price)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [name, description || null, totalPrice]
        );

        const packageId = packageResult.rows[0].id;

        // 添加套餐配件
        for (const item of items) {
            await client.query(
                `INSERT INTO package_items (package_id, product_id, quantity)
                 VALUES ($1, $2, $3)`,
                [packageId, item.product_id, item.quantity]
            );
        }

        await client.query('COMMIT');

        return NextResponse.json({
            success: true,
            message: '套餐创建成功',
            data: packageResult.rows[0],
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create package error:', error);
        return NextResponse.json({ error: '创建套餐失败' }, { status: 500 });
    } finally {
        client.release();
    }
}
