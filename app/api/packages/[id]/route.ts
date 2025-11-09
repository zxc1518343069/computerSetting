import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - 获取单个套餐详情
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = params.id;

        const result = await pool.query(
            `SELECT p.*,
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
             WHERE p.id = $1
             GROUP BY p.id`,
            [id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: '套餐不存在' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Get package error:', error);
        return NextResponse.json({ error: '获取套餐详情失败' }, { status: 500 });
    }
}

// PUT - 更新套餐
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    const client = await pool.connect();

    try {
        const id = params.id;
        const { name, description, items } = await request.json();

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

        // 更新套餐
        const packageResult = await client.query(
            `UPDATE packages
             SET name = $1, description = $2, total_price = $3, updated_at = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING *`,
            [name, description || null, totalPrice, id]
        );

        if (packageResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: '套餐不存在' }, { status: 404 });
        }

        // 删除旧的套餐配件
        await client.query('DELETE FROM package_items WHERE package_id = $1', [id]);

        // 添加新的套餐配件
        for (const item of items) {
            await client.query(
                `INSERT INTO package_items (package_id, product_id, quantity)
                 VALUES ($1, $2, $3)`,
                [id, item.product_id, item.quantity]
            );
        }

        await client.query('COMMIT');

        return NextResponse.json({
            success: true,
            message: '套餐更新成功',
            data: packageResult.rows[0],
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update package error:', error);
        return NextResponse.json({ error: '更新套餐失败' }, { status: 500 });
    } finally {
        client.release();
    }
}

// DELETE - 删除套餐
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = params.id;

        const result = await pool.query('DELETE FROM packages WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: '套餐不存在' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: '套餐删除成功',
        });
    } catch (error) {
        console.error('Delete package error:', error);
        return NextResponse.json({ error: '删除套餐失败' }, { status: 500 });
    }
}
