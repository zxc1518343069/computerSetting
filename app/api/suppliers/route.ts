import { getDb } from '@/lib/db';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');

        const rows = search
            ? db
                  .prepare(
                      `
                      SELECT * FROM suppliers
                      WHERE name LIKE @search OR contact_name LIKE @search OR phone LIKE @search
                      ORDER BY created_at DESC
                  `
                  )
                  .all({ search: `%${search}%` })
            : db.prepare('SELECT * FROM suppliers ORDER BY created_at DESC').all();

        return success(rows, '获取进货商家成功');
    } catch (e) {
        console.error('Get suppliers error:', e);
        return error(500, '获取进货商家失败');
    }
}

export async function POST(request: NextRequest) {
    try {
        const db = getDb();
        const { name, contact_name, phone, address, note } = await request.json();

        if (!name) {
            return error(400, '商家名称不能为空');
        }

        const result = db
            .prepare(
                `
                INSERT INTO suppliers (name, contact_name, phone, address, note, updated_at)
                VALUES (@name, @contact_name, @phone, @address, @note, CURRENT_TIMESTAMP)
            `
            )
            .run({ name, contact_name, phone, address, note });

        const row = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid);
        return success(row, '进货商家创建成功');
    } catch (e) {
        console.error('Create supplier error:', e);
        return error(500, '创建进货商家失败');
    }
}
