/* eslint-disable @typescript-eslint/no-explicit-any */
import api from '@/lib/request/axios';

export interface DataExchangeSheet {
    table: string;
    sheet: string;
    columns: string[];
    rows: Array<Record<string, unknown>>;
}

export interface DataExchangeWorkbook {
    mode: 'template' | 'export';
    generated_at: string;
    sheets: DataExchangeSheet[];
}

export interface ParsedWorkbookPayload {
    sheets: Record<string, Array<Record<string, unknown>>>;
}

export const fetchDataExchangeWorkbook = (mode: 'template' | 'export') => {
    return api.get<any, DataExchangeWorkbook>('/data-exchange', { params: { mode } });
};

export const importDataExchangeWorkbook = (payload: ParsedWorkbookPayload) => {
    return api.post<any, void>('/data-exchange', payload);
};
