import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - 获取单个产品详情
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = params.id;

        const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: '产品不存在' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Get product error:', error);
        return NextResponse.json({ error: '获取产品详情失败' }, { status: 500 });
    }
}

// PUT - 更新产品
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        const { category, name, price } = await request.json();

        if (!category || !name || price === undefined) {
            return NextResponse.json({ error: '产品类别、名称和价格不能为空' }, { status: 400 });
        }

        const result = await pool.query(
            `UPDATE products
             SET category = $1, name = $2, price = $3, updated_at = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING *`,
            [category, name, price, id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: '产品不存在' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: '产品更新成功',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Update product error:', error);
        return NextResponse.json({ error: '更新产品失败' }, { status: 500 });
    }
}

// DELETE - 删除产品
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = params.id;

        const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: '产品不存在' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: '产品删除成功',
        });
    } catch (error) {
        console.error('Delete product error:', error);
        return NextResponse.json({ error: '删除产品失败' }, { status: 500 });
    }
}
