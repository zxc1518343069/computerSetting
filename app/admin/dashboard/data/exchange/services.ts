/* eslint-disable @typescript-eslint/no-explicit-any */
import api from '@/lib/request/axios';

export interface DataExchangeSheet {
    table: string;
    sheet: string;
    columns: string[];
    columnLabels: Record<string, string>;
    rows: Array<Record<string, unknown>>;
}

export interface DataExchangeWorkbook {
    mode: 'export';
    generated_at: string;
    sheets: DataExchangeSheet[];
}

export const fetchDataExchangeWorkbook = (params?: {
    tables?: string[];
    includeRows?: boolean;
}) => {
    return api.get<any, DataExchangeWorkbook>('/data-exchange', {
        params: {
            mode: 'export',
            includeRows: params?.includeRows,
            tables: params?.tables?.join(','),
        },
    });
};
