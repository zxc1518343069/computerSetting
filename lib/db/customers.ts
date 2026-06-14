import type { SqliteDb } from './index';
import { toYuan } from './serializers';

export interface CustomerInput {
    name?: string | null;
    phone?: string | null;
    wechat?: string | null;
    address?: string | null;
    note?: string | null;
}

export interface CustomerRow {
    id: number;
    name: string;
    phone: string;
    wechat?: string | null;
    address?: string | null;
    note?: string | null;
    created_at?: string;
    updated_at?: string;
    order_count?: number;
    receivable_amount_cents?: number;
    latest_order_at?: string | null;
}

export const normalizeCustomerPhone = (phone?: string | null) => (phone || '').trim();

export const normalizeCustomerName = (name?: string | null) => (name || '').trim();

export const serializeCustomer = (row: CustomerRow) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    wechat: row.wechat,
    address: row.address,
    note: row.note,
    created_at: row.created_at,
    updated_at: row.updated_at,
    order_count: Number(row.order_count || 0),
    receivable_amount: toYuan(Number(row.receivable_amount_cents || 0)),
    latest_order_at: row.latest_order_at,
});

export const getCustomerById = (db: SqliteDb, id: number) => {
    const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as
        | CustomerRow
        | undefined;
    return row ? serializeCustomer(row) : null;
};

export const getCustomerRowById = (db: SqliteDb, id: number) => {
    return db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as CustomerRow | undefined;
};

export const findCustomerByPhone = (db: SqliteDb, phone: string, excludeId?: number) => {
    const conditions = ['phone = @phone'];
    const params: Record<string, string | number> = { phone };
    if (excludeId) {
        conditions.push('id != @excludeId');
        params.excludeId = excludeId;
    }

    return db
        .prepare(`SELECT * FROM customers WHERE ${conditions.join(' AND ')} LIMIT 1`)
        .get(params) as CustomerRow | undefined;
};

export const validateCustomerInput = (
    db: SqliteDb,
    data: CustomerInput,
    options: { excludeId?: number } = {}
) => {
    const name = normalizeCustomerName(data.name);
    const phone = normalizeCustomerPhone(data.phone);

    if (!name) throw new Error('CUSTOMER_NAME_REQUIRED');
    if (!phone) throw new Error('CUSTOMER_PHONE_REQUIRED');
    if (findCustomerByPhone(db, phone, options.excludeId)) {
        throw new Error('CUSTOMER_PHONE_EXISTS');
    }

    return {
        name,
        phone,
        wechat: data.wechat || null,
        address: data.address || null,
        note: data.note || null,
    };
};

export const createCustomer = (db: SqliteDb, data: CustomerInput) => {
    const payload = validateCustomerInput(db, data);
    const result = db
        .prepare(
            `
            INSERT INTO customers (name, phone, wechat, address, note, updated_at)
            VALUES (@name, @phone, @wechat, @address, @note, CURRENT_TIMESTAMP)
        `
        )
        .run(payload);

    return Number(result.lastInsertRowid);
};

export const updateCustomer = (db: SqliteDb, id: number, data: CustomerInput) => {
    const payload = validateCustomerInput(db, data, { excludeId: id });
    const result = db
        .prepare(
            `
            UPDATE customers
            SET name = @name,
                phone = @phone,
                wechat = @wechat,
                address = @address,
                note = @note,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `
        )
        .run({ id, ...payload });

    if (result.changes === 0) throw new Error('CUSTOMER_NOT_FOUND');
};

export const listCustomers = (db: SqliteDb, filters: { search?: string | null } = {}) => {
    const conditions: string[] = [];
    const params: Record<string, string> = {};

    if (filters.search) {
        conditions.push(`
            (
                c.name LIKE @search
                OR c.phone LIKE @search
                OR c.wechat LIKE @search
                OR c.note LIKE @search
            )
        `);
        params.search = `%${filters.search}%`;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db
        .prepare(
            `
            SELECT c.*,
                   COUNT(so.id) AS order_count,
                   COALESCE(SUM(
                       CASE
                           WHEN so.payment_status = 'unpaid'
                                AND so.delivery_status != 'cancelled'
                           THEN so.final_amount_cents
                           ELSE 0
                       END
                   ), 0) AS receivable_amount_cents,
                   MAX(so.created_at) AS latest_order_at
            FROM customers c
            LEFT JOIN sales_orders so ON so.customer_id = c.id
            ${where}
            GROUP BY c.id
            ORDER BY c.created_at DESC, c.id DESC
        `
        )
        .all(params) as CustomerRow[];

    return rows.map(serializeCustomer);
};
