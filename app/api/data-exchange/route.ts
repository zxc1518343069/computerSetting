import { getDb } from '@/lib/db';
import { dataExchangeTableMap, dataExchangeTables } from '@/lib/db/dataExchange';
import type { DataExchangeTable } from '@/lib/db/dataExchange';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

const parseSelectedTables = (value: string | null) =>
    Array.from(
        new Set(
            value
                ?.split(',')
                .map((name) => name.trim())
                .filter(Boolean) || []
        )
    );

const resolveExportTables = (selectedTableNames: string[]) => {
    if (selectedTableNames.length === 0) {
        return { tables: dataExchangeTables };
    }

    const invalidTables = selectedTableNames.filter(
        (tableName) => !dataExchangeTableMap.has(tableName)
    );
    if (invalidTables.length > 0) {
        return { errorMessage: `未知导出工作表：${invalidTables.join('、')}` };
    }

    const tables = selectedTableNames.map((tableName) => dataExchangeTableMap.get(tableName)!);
    return { tables };
};

const getWorkbookData = (tables: DataExchangeTable[], includeRows: boolean) => {
    const db = includeRows ? getDb() : null;

    return tables.map((table) => {
        const rows = includeRows
            ? (db!
                  .prepare(`SELECT ${table.columns.join(', ')} FROM ${table.table} ORDER BY id ASC`)
                  .all() as Array<Record<string, unknown>>)
            : [];

        return {
            table: table.table,
            sheet: table.sheet,
            columns: table.columns,
            columnLabels: table.columnLabels,
            rows,
        };
    });
};

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('mode') || 'export';

        if (mode !== 'export') {
            return error(400, '数据交换仅支持导出数据');
        }

        const selectedTableNames = parseSelectedTables(searchParams.get('tables'));
        const resolved = resolveExportTables(selectedTableNames);
        if (resolved.errorMessage || !resolved.tables) {
            return error(400, resolved.errorMessage || '导出工作表参数无效');
        }

        const includeRows = searchParams.get('includeRows') !== 'false';

        return success(
            {
                mode: 'export' as const,
                generated_at: new Date().toISOString(),
                sheets: getWorkbookData(resolved.tables, includeRows),
            },
            '导出数据成功'
        );
    } catch (e) {
        console.error('Get data exchange workbook error:', e);
        return error(500, '获取数据导出文件失败');
    }
}

export async function POST() {
    return error(405, '数据导入功能已下线');
}
