import { getDb } from '@/lib/db';
import { toCents, toYuan } from '@/lib/db/serializers';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

const serializeCost = (row: Record<string, unknown>) => ({
    id: row.id,
    type: row.type,
    name: row.name,
    amount: toYuan(row.amount_cents as number),
    cost_date: row.cost_date,
    note: row.note,
    created_at: row.created_at,
    updated_at: row.updated_at,
});

export async function GET(request: NextRequest) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const search = searchParams.get('search');
        const month = searchParams.get('month');

        const conditions: string[] = [];
        const params: Record<string, string> = {};

        if (type) {
            conditions.push('type = @type');
            params.type = type;
        }
        if (search) {
            conditions.push('(name LIKE @search OR note LIKE @search)');
            params.search = `%${search}%`;
        }
        if (month) {
            conditions.push("strftime('%Y-%m', cost_date) = @month");
            params.month = month;
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const rows = db
            .prepare(
                `SELECT * FROM operating_costs ${where} ORDER BY cost_date DESC, created_at DESC`
            )
            .all(params) as Record<string, unknown>[];

        return success(rows.map(serializeCost), '获取成本记录成功');
    } catch (e) {
        console.error('Get operating costs error:', e);
        return error(500, '获取成本记录失败');
    }
}

export async function POST(request: NextRequest) {
    try {
        const db = getDb();
        const { type, name, amount, cost_date, note } = await request.json();

        if (!type || !name || amount === undefined || !cost_date) {
            return error(400, '成本类型、名称、金额和日期不能为空');
        }

        const result = db
            .prepare(
                `
                INSERT INTO operating_costs (type, name, amount_cents, cost_date, note, updated_at)
                VALUES (@type, @name, @amount_cents, @cost_date, @note, CURRENT_TIMESTAMP)
            `
            )
            .run({ type, name, amount_cents: toCents(amount), cost_date, note });

        const row = db
            .prepare('SELECT * FROM operating_costs WHERE id = ?')
            .get(result.lastInsertRowid) as Record<string, unknown>;

        return success(serializeCost(row), '成本记录创建成功');
    } catch (e) {
        console.error('Create operating cost error:', e);
        return error(500, '创建成本记录失败');
    }
}
