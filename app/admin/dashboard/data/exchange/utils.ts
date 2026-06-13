import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { DataExchangeWorkbook } from './services';

const formatTimestampForFilename = () => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');

    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(
        now.getHours()
    )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

export const buildDataExchangeFilename = () => {
    return `computer-data-export-${formatTimestampForFilename()}.xlsx`;
};

export const downloadDataExchangeWorkbook = (
    workbook: DataExchangeWorkbook,
    filename = buildDataExchangeFilename()
) => {
    const xlsxWorkbook = XLSX.utils.book_new();

    workbook.sheets.forEach((sheet) => {
        const headers = sheet.columns.map((column) => sheet.columnLabels[column]);
        const rows = sheet.rows.map((row) => sheet.columns.map((column) => row[column] ?? ''));
        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

        worksheet['!cols'] = sheet.columns.map((column) => ({
            wch: Math.max(sheet.columnLabels[column].length + 4, 14),
        }));

        XLSX.utils.book_append_sheet(xlsxWorkbook, worksheet, sheet.sheet);
    });

    const buffer = XLSX.write(xlsxWorkbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    saveAs(blob, filename);
};
