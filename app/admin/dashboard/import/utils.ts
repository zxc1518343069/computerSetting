import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { DataExchangeWorkbook, ParsedWorkbookPayload } from './services';

const formatTimestampForFilename = () => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');

    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(
        now.getHours()
    )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

const formatDateCell = (date: Date) => {
    const pad = (value: number) => String(value).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
        date.getHours()
    )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const normalizeParsedCell = (value: unknown) => {
    if (value instanceof Date) return formatDateCell(value);
    if (value === undefined || value === null) return '';
    return value;
};

export const buildDataExchangeFilename = (mode: DataExchangeWorkbook['mode']) => {
    const prefix = mode === 'template' ? 'computer-data-template' : 'computer-data-export';
    return `${prefix}-${formatTimestampForFilename()}.xlsx`;
};

export const downloadDataExchangeWorkbook = (
    workbook: DataExchangeWorkbook,
    filename = buildDataExchangeFilename(workbook.mode)
) => {
    const xlsxWorkbook = XLSX.utils.book_new();

    workbook.sheets.forEach((sheet) => {
        const rows = sheet.rows.map((row) => sheet.columns.map((column) => row[column] ?? ''));
        const worksheet = XLSX.utils.aoa_to_sheet([sheet.columns, ...rows]);

        worksheet['!cols'] = sheet.columns.map((column) => ({
            wch: Math.max(column.length + 4, 14),
        }));

        XLSX.utils.book_append_sheet(xlsxWorkbook, worksheet, sheet.sheet);
    });

    const buffer = XLSX.write(xlsxWorkbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    saveAs(blob, filename);
};

export const parseDataExchangeFile = async (file: File): Promise<ParsedWorkbookPayload> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

    const sheets = workbook.SheetNames.reduce<ParsedWorkbookPayload['sheets']>((acc, sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
            defval: '',
            raw: true,
        });

        acc[sheetName] = rows.map((row) =>
            Object.entries(row).reduce<Record<string, unknown>>((normalized, [key, value]) => {
                normalized[key.trim()] = normalizeParsedCell(value);
                return normalized;
            }, {})
        );

        return acc;
    }, {});

    return { sheets };
};
