import { getDb } from '@/lib/db';
import { dataExchangeDeleteOrder, dataExchangeTables } from '@/lib/db/dataExchange';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

const normalizeCellValue = (value: unknown) => {
    if (value === undefined || value === '') return null;
    return value;
};

const ensureDefaultPricingConfig = (db: ReturnType<typeof getDb>) => {
    const existing = db.prepare('SELECT id FROM pricing_config ORDER BY id DESC LIMIT 1').get();
    if (existing) return;

    db.prepare(
        `
        INSERT INTO pricing_config (
            id,
            unified_pricing,
            unified_rate,
            rounding_type,
            cpu_rate,
            motherboard_rate,
            ram_rate,
            gpu_rate,
            storage_rate,
            psu_rate,
            case_rate,
            cooling_rate,
            monitor_rate
        )
        VALUES (1, 1, 0, 'none', 0, 0, 0, 0, 0, 0, 0, 0, 0)
    `
    ).run();
};

const recalculateAllProductStock = (db: ReturnType<typeof getDb>) => {
    const products = db.prepare('SELECT id FROM products').all() as Array<{ id: number }>;
    const countStmt = db.prepare(
        "SELECT COUNT(*) AS count FROM inventory_items WHERE product_id = ? AND status = 'in_stock'"
    );
    const updateStmt = db.prepare(
        'UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );

    products.forEach((product) => {
        const row = countStmt.get(product.id) as { count: number };
        updateStmt.run(row.count, product.id);
    });
};

const assertForeignKeysValid = (db: ReturnType<typeof getDb>) => {
    const violations = db.prepare('PRAGMA foreign_key_check').all();
    if (violations.length === 0) return;

    throw new Error('FOREIGN_KEY_CHECK_FAILED');
};

const validateSheets = (sheets: Record<string, unknown>) => {
    const missingSheets = dataExchangeTables
        .filter((table) => !(table.sheet in sheets) && !(table.table in sheets))
        .map((table) => table.sheet);

    if (missingSheets.length > 0) {
        return `缺少必要工作表：${missingSheets.join('、')}`;
    }

    const totalRows = dataExchangeTables.reduce((count, table) => {
        const rows = sheets[table.sheet] || sheets[table.table] || [];
        return count + (Array.isArray(rows) ? rows.length : 0);
    }, 0);

    if (totalRows === 0) {
        return '文件中没有可恢复的数据，请上传导出的备份文件';
    }

    return null;
};

const getWorkbookData = (mode: 'template' | 'export') => {
    const db = getDb();

    return dataExchangeTables.map((table) => {
        const rows =
            mode === 'template'
                ? []
                : (db
                      .prepare(
                          `SELECT ${table.columns.join(', ')} FROM ${table.table} ORDER BY id ASC`
                      )
                      .all() as Array<Record<string, unknown>>);

        return {
            table: table.table,
            sheet: table.sheet,
            columns: table.columns,
            rows,
        };
    });
};

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('mode') === 'template' ? 'template' : 'export';
        return success(
            {
                mode,
                generated_at: new Date().toISOString(),
                sheets: getWorkbookData(mode),
            },
            mode === 'template' ? '获取导入模板成功' : '导出数据成功'
        );
    } catch (e) {
        console.error('Get data exchange workbook error:', e);
        return error(500, '获取数据交换文件失败');
    }
}

export async function POST(request: NextRequest) {
    try {
        const db = getDb();
        const { sheets } = await request.json();

        if (!sheets || typeof sheets !== 'object') {
            return error(400, '上传文件中未找到有效工作表');
        }

        const validationError = validateSheets(sheets);
        if (validationError) {
            return error(400, validationError);
        }

        const importWorkbook = db.transaction(() => {
            dataExchangeDeleteOrder.forEach((table) => {
                db.prepare(`DELETE FROM ${table}`).run();
            });

            dataExchangeTables.forEach((table) => {
                db.prepare('DELETE FROM sqlite_sequence WHERE name = ?').run(table.table);
            });

            dataExchangeTables.forEach((table) => {
                const rows = sheets[table.sheet] || sheets[table.table] || [];
                if (!Array.isArray(rows) || rows.length === 0) return;

                const placeholders = table.columns.map((column) => `@${column}`).join(', ');
                const insert = db.prepare(
                    `INSERT INTO ${table.table} (${table.columns.join(', ')}) VALUES (${placeholders})`
                );

                rows.forEach((row: Record<string, unknown>) => {
                    const payload = table.columns.reduce(
                        (acc, column) => ({
                            ...acc,
                            [column]: normalizeCellValue(row[column]),
                        }),
                        {} as Record<string, unknown>
                    );
                    insert.run(payload);
                });
            });

            ensureDefaultPricingConfig(db);
            recalculateAllProductStock(db);
            assertForeignKeysValid(db);
        });

        db.pragma('foreign_keys = OFF');
        try {
            importWorkbook();
        } finally {
            db.pragma('foreign_keys = ON');
        }

        return success(null, '数据恢复成功');
    } catch (e) {
        console.error('Import data exchange workbook error:', e);
        return error(500, '数据恢复失败，请检查 Excel 文件格式');
    }
}
