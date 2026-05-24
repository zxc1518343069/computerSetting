import { error, success } from '@/lib/request/apiResponse';
import { getDb } from '@/lib/db';
import { ProductRow, serializeProduct, toCents } from '@/lib/db/serializers';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const search = searchParams.get('search');

        const conditions: string[] = [];
        const params: Record<string, string> = {};

        if (category) {
            conditions.push('category = @category');
            params.category = category;
        }

        if (search) {
            conditions.push('name LIKE @search');
            params.search = `%${search}%`;
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const rows = db
            .prepare(`SELECT * FROM products ${where} ORDER BY created_at DESC`)
            .all(params) as ProductRow[];

        return success(rows.map(serializeProduct), '获取产品列表成功');
    } catch (e) {
        console.error('Get products error:', e);
        return error(500, '获取产品列表失败');
    }
}

export async function POST(request: NextRequest) {
    try {
        const db = getDb();
        const { category, name, price, selling_price, is_use_premium } = await request.json();

        if (!category || !name || price === undefined) {
            return error(400, '产品类别、名称和价格不能为空');
        }

        const result = db
            .prepare(
                `
                INSERT INTO products (
                    category,
                    name,
                    price_cents,
                    stock_quantity,
                    selling_price_cents,
                    is_use_premium,
                    updated_at
                )
                VALUES (@category, @name, @price_cents, 0, @selling_price_cents, @is_use_premium, CURRENT_TIMESTAMP)
            `
            )
            .run({
                category,
                name,
                price_cents: toCents(price),
                selling_price_cents: is_use_premium ? null : toCents(selling_price),
                is_use_premium: is_use_premium === false ? 0 : 1,
            });

        const row = db
            .prepare('SELECT * FROM products WHERE id = ?')
            .get(result.lastInsertRowid) as ProductRow;

        return success(serializeProduct(row), '产品创建成功');
    } catch (e) {
        console.error('Create product error:', e);
        return error(500, '创建产品失败');
    }
}
