import type { SqliteDb } from './index';
import { toCents, toYuan } from './serializers';

export type LogisticsCompanyStatus = 'active' | 'disabled';
export type LogisticsRecordType = 'purchase' | 'purchase_return' | 'manual';
export type LogisticsShippingFeeBearer = 'self' | 'merchant' | 'shared';
export type LogisticsSettlementTarget = 'logistics_company' | 'none';
export type LogisticsPaymentStatus = 'unpaid' | 'paid' | 'voided';
export type LogisticsRelatedType =
    | 'purchase_order'
    | 'inbound_order'
    | 'purchase_return'
    | 'manual';

interface LogisticsCompanyRow {
    id: number;
    name: string;
    contact?: string | null;
    note?: string | null;
    status: LogisticsCompanyStatus;
    created_at?: string;
    updated_at?: string;
}

interface LogisticsRecordRow {
    id: number;
    type: LogisticsRecordType;
    company_id?: number | null;
    tracking_no?: string | null;
    shipping_fee_cents: number;
    self_amount_cents: number;
    occurred_at: string;
    related_type?: LogisticsRelatedType | null;
    related_id?: number | null;
    shipping_fee_bearer: LogisticsShippingFeeBearer;
    settlement_target: LogisticsSettlementTarget;
    payment_status: LogisticsPaymentStatus;
    paid_at?: string | null;
    payment_account?: string | null;
    note?: string | null;
    created_at?: string;
    updated_at?: string;
    company_name?: string | null;
    company_contact?: string | null;
    company_status?: LogisticsCompanyStatus | null;
}

export interface SaveLogisticsCompanyInput {
    name?: string;
    contact?: string | null;
    note?: string | null;
    status?: LogisticsCompanyStatus;
}

export interface ListLogisticsCompanyFilters {
    search?: string | null;
    status?: LogisticsCompanyStatus | 'all' | null;
}

export interface SaveLogisticsRecordInput {
    type?: LogisticsRecordType;
    company_id?: number | null;
    tracking_no?: string | null;
    shipping_fee?: number;
    self_amount?: number;
    occurred_at?: string | null;
    related_type?: LogisticsRelatedType | null;
    related_id?: number | null;
    shipping_fee_bearer?: LogisticsShippingFeeBearer;
    settlement_target?: LogisticsSettlementTarget;
    payment_status?: LogisticsPaymentStatus;
    paid_at?: string | null;
    payment_account?: string | null;
    note?: string | null;
}

export interface ListLogisticsRecordFilters {
    search?: string | null;
    type?: LogisticsRecordType | 'all' | null;
    companyId?: number | null;
    paymentStatus?: LogisticsPaymentStatus | 'all' | null;
    settlementTarget?: LogisticsSettlementTarget | 'all' | null;
    relatedType?: LogisticsRelatedType | null;
    relatedId?: number | null;
    dateFrom?: string | null;
    dateTo?: string | null;
}

export interface LogisticsStatsFilters {
    type?: LogisticsRecordType | 'all' | null;
    companyId?: number | null;
    paymentStatus?: LogisticsPaymentStatus | 'all' | null;
    settlementTarget?: LogisticsSettlementTarget | 'all' | null;
    dateFrom?: string | null;
    dateTo?: string | null;
}

const companyStatuses: LogisticsCompanyStatus[] = ['active', 'disabled'];
const recordTypes: LogisticsRecordType[] = ['purchase', 'purchase_return', 'manual'];
const shippingFeeBearers: LogisticsShippingFeeBearer[] = ['self', 'merchant', 'shared'];
const settlementTargets: LogisticsSettlementTarget[] = ['logistics_company', 'none'];
const paymentStatuses: LogisticsPaymentStatus[] = ['unpaid', 'paid', 'voided'];
const relatedTypes: LogisticsRelatedType[] = [
    'purchase_order',
    'inbound_order',
    'purchase_return',
    'manual',
];

const normalizeOptionalText = (value: unknown) => {
    const text = String(value || '').trim();
    return text || null;
};

const normalizeDate = (value: unknown) =>
    value ? new Date(String(value)).toISOString() : new Date().toISOString();

const normalizeOptionalDate = (value: unknown) =>
    value ? new Date(String(value)).toISOString() : null;

const assertNonNegative = (amountCents: number, message: string) => {
    if (amountCents < 0) throw new Error(message);
};

const normalizeCompanyStatus = (value: unknown): LogisticsCompanyStatus =>
    companyStatuses.includes(value as LogisticsCompanyStatus)
        ? (value as LogisticsCompanyStatus)
        : 'active';

const normalizeRecordType = (value: unknown): LogisticsRecordType =>
    recordTypes.includes(value as LogisticsRecordType) ? (value as LogisticsRecordType) : 'manual';

const normalizeShippingFeeBearer = (value: unknown): LogisticsShippingFeeBearer =>
    shippingFeeBearers.includes(value as LogisticsShippingFeeBearer)
        ? (value as LogisticsShippingFeeBearer)
        : 'self';

const normalizeSettlementTarget = (value: unknown): LogisticsSettlementTarget =>
    settlementTargets.includes(value as LogisticsSettlementTarget)
        ? (value as LogisticsSettlementTarget)
        : 'logistics_company';

const normalizePaymentStatus = (value: unknown): LogisticsPaymentStatus =>
    paymentStatuses.includes(value as LogisticsPaymentStatus)
        ? (value as LogisticsPaymentStatus)
        : 'unpaid';

const normalizeRelatedType = (value: unknown): LogisticsRelatedType | null =>
    relatedTypes.includes(value as LogisticsRelatedType) ? (value as LogisticsRelatedType) : null;

const getCompanyRow = (db: SqliteDb, id: number) =>
    db.prepare('SELECT * FROM logistics_companies WHERE id = ?').get(id) as
        | LogisticsCompanyRow
        | undefined;

export const serializeLogisticsCompany = (row: LogisticsCompanyRow) => ({
    id: row.id,
    name: row.name,
    contact: row.contact,
    note: row.note,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
});

export const serializeLogisticsRecord = (row: LogisticsRecordRow) => ({
    id: row.id,
    type: row.type,
    company_id: row.company_id ?? null,
    company: row.company_id
        ? {
              id: row.company_id,
              name: row.company_name || '未命名物流公司',
              contact: row.company_contact || null,
              status: row.company_status || 'active',
          }
        : null,
    tracking_no: row.tracking_no,
    shipping_fee: toYuan(Number(row.shipping_fee_cents || 0)),
    self_amount: toYuan(Number(row.self_amount_cents || 0)),
    occurred_at: row.occurred_at,
    related_type: row.related_type,
    related_id: row.related_id,
    shipping_fee_bearer: row.shipping_fee_bearer,
    settlement_target: row.settlement_target,
    payment_status: row.payment_status,
    paid_at: row.paid_at,
    payment_account: row.payment_account,
    note: row.note,
    payable_amount:
        row.settlement_target === 'logistics_company' && row.payment_status === 'unpaid'
            ? toYuan(Number(row.self_amount_cents || 0))
            : 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
});

type SerializedLogisticsRecord = ReturnType<typeof serializeLogisticsRecord>;

export const listLogisticsCompanies = (db: SqliteDb, filters: ListLogisticsCompanyFilters = {}) => {
    const conditions: string[] = [];
    const params: Record<string, string> = {};

    if (filters.status && filters.status !== 'all') {
        conditions.push('status = @status');
        params.status = filters.status;
    }
    if (filters.search) {
        conditions.push('(name LIKE @search OR contact LIKE @search OR note LIKE @search)');
        params.search = `%${filters.search}%`;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db
        .prepare(
            `
            SELECT *
            FROM logistics_companies
            ${where}
            ORDER BY status ASC, updated_at DESC, id DESC
        `
        )
        .all(params) as LogisticsCompanyRow[];

    return rows.map(serializeLogisticsCompany);
};

export const createLogisticsCompany = (db: SqliteDb, input: SaveLogisticsCompanyInput) => {
    const name = normalizeOptionalText(input.name);
    if (!name) throw new Error('LOGISTICS_COMPANY_NAME_REQUIRED');

    const result = db
        .prepare(
            `
            INSERT INTO logistics_companies (name, contact, note, status, updated_at)
            VALUES (@name, @contact, @note, @status, CURRENT_TIMESTAMP)
        `
        )
        .run({
            name,
            contact: normalizeOptionalText(input.contact),
            note: normalizeOptionalText(input.note),
            status: normalizeCompanyStatus(input.status),
        });

    return Number(result.lastInsertRowid);
};

export const updateLogisticsCompany = (
    db: SqliteDb,
    id: number,
    input: SaveLogisticsCompanyInput
) => {
    const current = getCompanyRow(db, id);
    if (!current) throw new Error('LOGISTICS_COMPANY_NOT_FOUND');

    const name =
        input.name === undefined ? current.name : normalizeOptionalText(input.name || current.name);
    if (!name) throw new Error('LOGISTICS_COMPANY_NAME_REQUIRED');

    db.prepare(
        `
        UPDATE logistics_companies
        SET name = @name,
            contact = @contact,
            note = @note,
            status = @status,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
    `
    ).run({
        id,
        name,
        contact:
            input.contact === undefined ? current.contact : normalizeOptionalText(input.contact),
        note: input.note === undefined ? current.note : normalizeOptionalText(input.note),
        status: input.status === undefined ? current.status : normalizeCompanyStatus(input.status),
    });

    return id;
};

export const disableLogisticsCompany = (db: SqliteDb, id: number) => {
    const result = db
        .prepare(
            `
            UPDATE logistics_companies
            SET status = 'disabled',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `
        )
        .run(id);
    if (result.changes === 0) throw new Error('LOGISTICS_COMPANY_NOT_FOUND');
    return id;
};

const buildLogisticsRecordQuery = (filters: ListLogisticsRecordFilters = {}) => {
    const conditions: string[] = [];
    const params: Record<string, string | number> = {};

    if (filters.type && filters.type !== 'all') {
        conditions.push('lr.type = @type');
        params.type = filters.type;
    }
    if (filters.companyId) {
        conditions.push('lr.company_id = @companyId');
        params.companyId = filters.companyId;
    }
    if (filters.paymentStatus && filters.paymentStatus !== 'all') {
        conditions.push('lr.payment_status = @paymentStatus');
        params.paymentStatus = filters.paymentStatus;
    }
    if (filters.settlementTarget && filters.settlementTarget !== 'all') {
        conditions.push('lr.settlement_target = @settlementTarget');
        params.settlementTarget = filters.settlementTarget;
    }
    if (filters.relatedType) {
        conditions.push('lr.related_type = @relatedType');
        params.relatedType = filters.relatedType;
    }
    if (filters.relatedId) {
        conditions.push('lr.related_id = @relatedId');
        params.relatedId = filters.relatedId;
    }
    if (filters.dateFrom) {
        conditions.push('lr.occurred_at >= @dateFrom');
        params.dateFrom = normalizeDate(filters.dateFrom);
    }
    if (filters.dateTo) {
        conditions.push('lr.occurred_at <= @dateTo');
        params.dateTo = normalizeDate(filters.dateTo);
    }
    if (filters.search) {
        conditions.push(
            '(lr.tracking_no LIKE @search OR lr.note LIKE @search OR lc.name LIKE @search OR CAST(lr.related_id AS TEXT) LIKE @search)'
        );
        params.search = `%${filters.search}%`;
    }

    return {
        where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
        params,
    };
};

export const listLogisticsRecords = (db: SqliteDb, filters: ListLogisticsRecordFilters = {}) => {
    const { where, params } = buildLogisticsRecordQuery(filters);
    const rows = db
        .prepare(
            `
            SELECT lr.*,
                   lc.name AS company_name,
                   lc.contact AS company_contact,
                   lc.status AS company_status
            FROM logistics_records lr
            LEFT JOIN logistics_companies lc ON lc.id = lr.company_id
            ${where}
            ORDER BY lr.occurred_at DESC, lr.created_at DESC, lr.id DESC
        `
        )
        .all(params) as LogisticsRecordRow[];

    return rows.map(serializeLogisticsRecord);
};

const buildLogisticsStatsQuery = (filters: LogisticsStatsFilters = {}) => {
    const conditions: string[] = [];
    const params: Record<string, string | number> = {};

    if (filters.type && filters.type !== 'all') {
        conditions.push('lr.type = @type');
        params.type = filters.type;
    }
    if (filters.companyId) {
        conditions.push('lr.company_id = @companyId');
        params.companyId = filters.companyId;
    }
    if (filters.paymentStatus && filters.paymentStatus !== 'all') {
        conditions.push('lr.payment_status = @paymentStatus');
        params.paymentStatus = filters.paymentStatus;
    } else {
        conditions.push("lr.payment_status <> 'voided'");
    }
    if (filters.settlementTarget && filters.settlementTarget !== 'all') {
        conditions.push('lr.settlement_target = @settlementTarget');
        params.settlementTarget = filters.settlementTarget;
    }
    if (filters.dateFrom) {
        conditions.push('lr.occurred_at >= @dateFrom');
        params.dateFrom = normalizeDate(filters.dateFrom);
    }
    if (filters.dateTo) {
        conditions.push('lr.occurred_at <= @dateTo');
        params.dateTo = normalizeDate(filters.dateTo);
    }

    return {
        where: `WHERE ${conditions.join(' AND ')}`,
        params,
    };
};

const logisticsStatsAmountSelect = `
    COUNT(*) AS record_count,
    COALESCE(SUM(lr.shipping_fee_cents), 0) AS shipping_fee_cents,
    COALESCE(SUM(lr.self_amount_cents), 0) AS self_amount_cents,
    COALESCE(SUM(CASE
        WHEN lr.settlement_target = 'logistics_company'
         AND lr.payment_status = 'unpaid'
        THEN lr.self_amount_cents ELSE 0 END), 0) AS payable_amount_cents,
    COALESCE(SUM(CASE
        WHEN lr.settlement_target = 'logistics_company'
         AND lr.payment_status = 'paid'
        THEN lr.self_amount_cents ELSE 0 END), 0) AS paid_amount_cents
`;

const serializeLogisticsStatsAmount = (row: Record<string, unknown>) => ({
    record_count: Number(row.record_count || 0),
    shipping_fee: toYuan(Number(row.shipping_fee_cents || 0)),
    self_amount: toYuan(Number(row.self_amount_cents || 0)),
    payable_amount: toYuan(Number(row.payable_amount_cents || 0)),
    paid_amount: toYuan(Number(row.paid_amount_cents || 0)),
});

const serializeLogisticsStatsGroup = (row: Record<string, unknown>) => ({
    key: String(row.group_key || ''),
    label: String(row.group_label || row.group_key || '-'),
    ...serializeLogisticsStatsAmount(row),
});

export const getLogisticsStats = (db: SqliteDb, filters: LogisticsStatsFilters = {}) => {
    const { where, params } = buildLogisticsStatsQuery(filters);
    const summary = db
        .prepare(
            `
            SELECT ${logisticsStatsAmountSelect}
            FROM logistics_records lr
            LEFT JOIN logistics_companies lc ON lc.id = lr.company_id
            ${where}
        `
        )
        .get(params) as Record<string, unknown>;

    const byCompany = db
        .prepare(
            `
            SELECT COALESCE(CAST(lr.company_id AS TEXT), 'none') AS group_key,
                   COALESCE(lc.name, '未指定物流公司') AS group_label,
                   ${logisticsStatsAmountSelect}
            FROM logistics_records lr
            LEFT JOIN logistics_companies lc ON lc.id = lr.company_id
            ${where}
            GROUP BY lr.company_id
            ORDER BY shipping_fee_cents DESC, record_count DESC
        `
        )
        .all(params) as Record<string, unknown>[];

    const byMonth = db
        .prepare(
            `
            SELECT SUBSTR(lr.occurred_at, 1, 7) AS group_key,
                   SUBSTR(lr.occurred_at, 1, 7) AS group_label,
                   ${logisticsStatsAmountSelect}
            FROM logistics_records lr
            LEFT JOIN logistics_companies lc ON lc.id = lr.company_id
            ${where}
            GROUP BY SUBSTR(lr.occurred_at, 1, 7)
            ORDER BY group_key DESC
        `
        )
        .all(params) as Record<string, unknown>[];

    const byType = db
        .prepare(
            `
            SELECT lr.type AS group_key,
                   lr.type AS group_label,
                   ${logisticsStatsAmountSelect}
            FROM logistics_records lr
            LEFT JOIN logistics_companies lc ON lc.id = lr.company_id
            ${where}
            GROUP BY lr.type
            ORDER BY shipping_fee_cents DESC, record_count DESC
        `
        )
        .all(params) as Record<string, unknown>[];

    const byPaymentStatus = db
        .prepare(
            `
            SELECT lr.payment_status AS group_key,
                   lr.payment_status AS group_label,
                   ${logisticsStatsAmountSelect}
            FROM logistics_records lr
            LEFT JOIN logistics_companies lc ON lc.id = lr.company_id
            ${where}
            GROUP BY lr.payment_status
            ORDER BY shipping_fee_cents DESC, record_count DESC
        `
        )
        .all(params) as Record<string, unknown>[];

    return {
        summary: serializeLogisticsStatsAmount(summary || {}),
        by_company: byCompany.map(serializeLogisticsStatsGroup),
        by_month: byMonth.map(serializeLogisticsStatsGroup),
        by_type: byType.map(serializeLogisticsStatsGroup),
        by_payment_status: byPaymentStatus.map(serializeLogisticsStatsGroup),
    };
};

export const getLogisticsRecordById = (db: SqliteDb, id: number) => {
    const row = db
        .prepare(
            `
            SELECT lr.*,
                   lc.name AS company_name,
                   lc.contact AS company_contact,
                   lc.status AS company_status
            FROM logistics_records lr
            LEFT JOIN logistics_companies lc ON lc.id = lr.company_id
            WHERE lr.id = ?
        `
        )
        .get(id) as LogisticsRecordRow | undefined;

    return row ? serializeLogisticsRecord(row) : null;
};

const getLogisticsRecordRowByRelated = (
    db: SqliteDb,
    relatedType: LogisticsRelatedType,
    relatedId: number,
    type?: LogisticsRecordType
) => {
    const params: Record<string, number | string> = {
        relatedType,
        relatedId,
    };
    const typeCondition = type ? 'AND lr.type = @type' : '';
    if (type) params.type = type;

    return db
        .prepare(
            `
            SELECT lr.*,
                   lc.name AS company_name,
                   lc.contact AS company_contact,
                   lc.status AS company_status
            FROM logistics_records lr
            LEFT JOIN logistics_companies lc ON lc.id = lr.company_id
            WHERE lr.related_type = @relatedType
              AND lr.related_id = @relatedId
              AND lr.payment_status <> 'voided'
              ${typeCondition}
            ORDER BY lr.updated_at DESC, lr.id DESC
            LIMIT 1
        `
        )
        .get(params) as LogisticsRecordRow | undefined;
};

export const getLogisticsRecordByRelated = (
    db: SqliteDb,
    relatedType: LogisticsRelatedType,
    relatedId: number,
    type?: LogisticsRecordType
) => {
    const row = getLogisticsRecordRowByRelated(db, relatedType, relatedId, type);
    return row ? serializeLogisticsRecord(row) : null;
};

const normalizeRecordPayload = (
    db: SqliteDb,
    input: SaveLogisticsRecordInput,
    fallback?: LogisticsRecordRow
) => {
    const type =
        input.type === undefined ? fallback?.type || 'manual' : normalizeRecordType(input.type);
    const companyId =
        input.company_id === undefined
            ? fallback?.company_id || null
            : input.company_id
              ? Number(input.company_id)
              : null;
    const shippingFeeCents =
        input.shipping_fee === undefined
            ? Number(fallback?.shipping_fee_cents || 0)
            : toCents(Number(input.shipping_fee || 0));
    const bearer =
        input.shipping_fee_bearer === undefined
            ? fallback?.shipping_fee_bearer || 'self'
            : normalizeShippingFeeBearer(input.shipping_fee_bearer);
    let selfAmountCents =
        input.self_amount === undefined
            ? fallback?.self_amount_cents
            : toCents(Number(input.self_amount || 0));

    if (selfAmountCents === undefined) {
        if (bearer === 'merchant') selfAmountCents = 0;
        else selfAmountCents = shippingFeeCents;
    }

    assertNonNegative(shippingFeeCents, 'INVALID_LOGISTICS_AMOUNT');
    assertNonNegative(selfAmountCents, 'INVALID_LOGISTICS_AMOUNT');

    if (companyId) {
        const company = getCompanyRow(db, companyId);
        if (!company) throw new Error('LOGISTICS_COMPANY_NOT_FOUND');
    }

    const settlementTarget =
        input.settlement_target === undefined
            ? fallback?.settlement_target || 'logistics_company'
            : normalizeSettlementTarget(input.settlement_target);
    if (settlementTarget === 'logistics_company' && !companyId) {
        throw new Error('LOGISTICS_COMPANY_REQUIRED');
    }

    let paymentStatus =
        input.payment_status === undefined
            ? fallback?.payment_status || 'unpaid'
            : normalizePaymentStatus(input.payment_status);
    if (settlementTarget === 'none' || selfAmountCents === 0) {
        paymentStatus = paymentStatus === 'voided' ? 'voided' : 'paid';
    }

    const paidAt =
        paymentStatus === 'paid'
            ? normalizeDate(input.paid_at || fallback?.paid_at)
            : paymentStatus === 'unpaid'
              ? null
              : normalizeOptionalDate(input.paid_at || fallback?.paid_at);

    return {
        type,
        company_id: companyId,
        tracking_no:
            input.tracking_no === undefined
                ? fallback?.tracking_no || null
                : normalizeOptionalText(input.tracking_no),
        shipping_fee_cents: Math.max(shippingFeeCents, selfAmountCents),
        self_amount_cents: selfAmountCents,
        occurred_at:
            input.occurred_at === undefined
                ? fallback?.occurred_at || new Date().toISOString()
                : normalizeDate(input.occurred_at),
        related_type:
            input.related_type === undefined
                ? fallback?.related_type || null
                : normalizeRelatedType(input.related_type),
        related_id:
            input.related_id === undefined
                ? fallback?.related_id || null
                : input.related_id
                  ? Number(input.related_id)
                  : null,
        shipping_fee_bearer: bearer,
        settlement_target: settlementTarget,
        payment_status: paymentStatus,
        paid_at: paidAt,
        payment_account:
            paymentStatus === 'paid'
                ? input.payment_account === undefined
                    ? fallback?.payment_account || null
                    : normalizeOptionalText(input.payment_account)
                : null,
        note: input.note === undefined ? fallback?.note || null : normalizeOptionalText(input.note),
    };
};

export const createLogisticsRecord = (db: SqliteDb, input: SaveLogisticsRecordInput) => {
    const payload = normalizeRecordPayload(db, input);
    const result = db
        .prepare(
            `
            INSERT INTO logistics_records (
                type, company_id, tracking_no, shipping_fee_cents, self_amount_cents,
                occurred_at, related_type, related_id, shipping_fee_bearer,
                settlement_target, payment_status, paid_at, payment_account, note, updated_at
            )
            VALUES (
                @type, @company_id, @tracking_no, @shipping_fee_cents, @self_amount_cents,
                @occurred_at, @related_type, @related_id, @shipping_fee_bearer,
                @settlement_target, @payment_status, @paid_at, @payment_account, @note,
                CURRENT_TIMESTAMP
            )
        `
        )
        .run(payload);

    return Number(result.lastInsertRowid);
};

export const updateLogisticsRecord = (
    db: SqliteDb,
    id: number,
    input: SaveLogisticsRecordInput
) => {
    const current = db.prepare('SELECT * FROM logistics_records WHERE id = ?').get(id) as
        | LogisticsRecordRow
        | undefined;
    if (!current) throw new Error('LOGISTICS_RECORD_NOT_FOUND');
    const relationLocked =
        current.type !== 'manual' && Boolean(current.related_type) && Boolean(current.related_id);
    if (relationLocked) {
        const nextRelatedType =
            input.related_type === undefined
                ? current.related_type || null
                : normalizeRelatedType(input.related_type);
        const nextRelatedId =
            input.related_id === undefined
                ? current.related_id || null
                : input.related_id
                  ? Number(input.related_id)
                  : null;
        if (
            nextRelatedType !== current.related_type ||
            Number(nextRelatedId || 0) !== Number(current.related_id || 0)
        ) {
            throw new Error('LOGISTICS_RELATED_RECORD_LOCKED');
        }
    }

    const payload = normalizeRecordPayload(db, input, current);
    db.prepare(
        `
        UPDATE logistics_records
        SET type = @type,
            company_id = @company_id,
            tracking_no = @tracking_no,
            shipping_fee_cents = @shipping_fee_cents,
            self_amount_cents = @self_amount_cents,
            occurred_at = @occurred_at,
            related_type = @related_type,
            related_id = @related_id,
            shipping_fee_bearer = @shipping_fee_bearer,
            settlement_target = @settlement_target,
            payment_status = @payment_status,
            paid_at = @paid_at,
            payment_account = @payment_account,
            note = @note,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
    `
    ).run({ id, ...payload });

    return id;
};

export const syncLogisticsRecordForRelated = (
    db: SqliteDb,
    input: SaveLogisticsRecordInput & {
        type: LogisticsRecordType;
        related_type: LogisticsRelatedType;
        related_id: number;
    }
) => {
    const relatedId = Number(input.related_id || 0);
    if (!relatedId) throw new Error('LOGISTICS_RELATED_ID_REQUIRED');

    const current = getLogisticsRecordRowByRelated(db, input.related_type, relatedId, input.type);
    const companyId =
        input.company_id === undefined
            ? current?.company_id || null
            : input.company_id
              ? Number(input.company_id)
              : null;
    const shippingFee =
        input.shipping_fee === undefined
            ? toYuan(Number(current?.shipping_fee_cents || 0))
            : Number(input.shipping_fee || 0);
    const bearer =
        input.shipping_fee_bearer === undefined
            ? current?.shipping_fee_bearer || 'self'
            : normalizeShippingFeeBearer(input.shipping_fee_bearer);
    const selfAmount =
        input.self_amount === undefined
            ? current
                ? toYuan(Number(current.self_amount_cents || 0))
                : bearer === 'merchant'
                  ? 0
                  : shippingFee
            : Number(input.self_amount || 0);
    const hasLogisticsInfo =
        Boolean(companyId) ||
        Boolean(normalizeOptionalText(input.tracking_no)) ||
        shippingFee > 0 ||
        selfAmount > 0;

    if (!current && !hasLogisticsInfo) return null;

    const settlementTarget =
        input.settlement_target === undefined
            ? companyId && selfAmount > 0
                ? 'logistics_company'
                : 'none'
            : normalizeSettlementTarget(input.settlement_target);
    const paymentStatus =
        input.payment_status === undefined
            ? settlementTarget === 'logistics_company' && selfAmount > 0
                ? current?.settlement_target === 'logistics_company'
                    ? current.payment_status
                    : 'unpaid'
                : 'paid'
            : normalizePaymentStatus(input.payment_status);
    const payload: SaveLogisticsRecordInput = {
        ...input,
        company_id: companyId,
        shipping_fee: shippingFee,
        self_amount: selfAmount,
        shipping_fee_bearer: bearer,
        settlement_target: settlementTarget,
        payment_status: paymentStatus,
        related_id: relatedId,
    };

    if (current) {
        updateLogisticsRecord(db, current.id, payload);
        return getLogisticsRecordById(db, current.id);
    }

    if (settlementTarget === 'logistics_company' && !companyId) return null;

    const id = createLogisticsRecord(db, payload);
    return getLogisticsRecordById(db, id);
};

export const voidLogisticsRecord = (db: SqliteDb, id: number, note?: string | null) => {
    const result = db
        .prepare(
            `
            UPDATE logistics_records
            SET payment_status = 'voided',
                note = COALESCE(@note, note),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `
        )
        .run({ id, note: normalizeOptionalText(note) });
    if (result.changes === 0) throw new Error('LOGISTICS_RECORD_NOT_FOUND');
    return id;
};

export const voidLogisticsRecordForRelated = (
    db: SqliteDb,
    relatedType: LogisticsRelatedType,
    relatedId: number,
    type?: LogisticsRecordType,
    note?: string | null
) => {
    const row = getLogisticsRecordRowByRelated(db, relatedType, relatedId, type);
    if (!row) return null;
    voidLogisticsRecord(db, row.id, note);
    return getLogisticsRecordById(db, row.id);
};

export const payLogisticsRecord = (
    db: SqliteDb,
    id: number,
    input: { paid_at?: string | null; payment_account?: string | null; note?: string | null }
) => {
    const record = db.prepare('SELECT * FROM logistics_records WHERE id = ?').get(id) as
        | LogisticsRecordRow
        | undefined;
    if (!record) throw new Error('LOGISTICS_RECORD_NOT_FOUND');
    if (record.payment_status === 'voided') throw new Error('LOGISTICS_RECORD_VOIDED');
    if (
        record.settlement_target !== 'logistics_company' ||
        Number(record.self_amount_cents || 0) <= 0
    ) {
        throw new Error('LOGISTICS_RECORD_NO_PAYABLE');
    }

    db.prepare(
        `
        UPDATE logistics_records
        SET payment_status = 'paid',
            paid_at = @paid_at,
            payment_account = @payment_account,
            note = COALESCE(@note, note),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
    `
    ).run({
        id,
        paid_at: normalizeDate(input.paid_at),
        payment_account: normalizeOptionalText(input.payment_account),
        note: normalizeOptionalText(input.note),
    });

    return id;
};

export const listLogisticsPayableRecords = (db: SqliteDb) =>
    listLogisticsRecords(db, {
        paymentStatus: 'unpaid',
        settlementTarget: 'logistics_company',
    }).filter((item) => item.self_amount > 0);

export const listLogisticsPayableAccounts = (db: SqliteDb) => {
    const records = listLogisticsPayableRecords(db);
    const accounts = records.reduce(
        (map, record) => {
            const key = String(record.company_id || record.company?.name || '未指定物流公司');
            const current =
                map.get(key) ||
                ({
                    company_id: record.company_id,
                    company_name: record.company?.name || '未指定物流公司',
                    contact: record.company?.contact || null,
                    record_count: 0,
                    payable_amount: 0,
                    latest_occurred_at: record.occurred_at,
                    records: [],
                } as {
                    company_id?: number | null;
                    company_name: string;
                    contact?: string | null;
                    record_count: number;
                    payable_amount: number;
                    latest_occurred_at?: string;
                    records: SerializedLogisticsRecord[];
                });

            current.record_count += 1;
            current.payable_amount += record.payable_amount;
            current.latest_occurred_at =
                !current.latest_occurred_at ||
                (record.occurred_at && record.occurred_at > current.latest_occurred_at)
                    ? record.occurred_at
                    : current.latest_occurred_at;
            current.records.push(record);
            map.set(key, current);
            return map;
        },
        new Map<
            string,
            {
                company_id?: number | null;
                company_name: string;
                contact?: string | null;
                record_count: number;
                payable_amount: number;
                latest_occurred_at?: string;
                records: SerializedLogisticsRecord[];
            }
        >()
    );

    return Array.from(accounts.values()).sort((a, b) => b.payable_amount - a.payable_amount);
};
