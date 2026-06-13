'use client';

import { LogisticsCompany, LogisticsRecord } from '@/const/types';
import { formatDate, formatPrice } from '@/utils';
import {
    CarOutlined,
    CheckCircleOutlined,
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
    WalletOutlined,
} from '@ant-design/icons';
import { useRequest } from 'ahooks';
import {
    Button,
    DatePicker,
    Form,
    Input,
    InputNumber,
    message,
    Modal,
    Popconfirm,
    Select,
    Table,
    Tabs,
    Tag,
    Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import React, { useMemo, useState } from 'react';
import {
    disableLogisticsCompany,
    fetchLogisticsCompanies,
    fetchLogisticsRecords,
    payLogisticsRecord,
    saveLogisticsCompany,
    saveLogisticsRecord,
    voidLogisticsRecord,
} from '../../services';

const recordTypeOptions = [
    { value: 'purchase', label: '进货物流', color: 'blue' },
    { value: 'purchase_return', label: '采购退货', color: 'purple' },
    { value: 'manual', label: '手工记录', color: 'default' },
];

const paymentStatusOptions = [
    { value: 'unpaid', label: '未付款', color: 'red' },
    { value: 'paid', label: '已付款', color: 'green' },
    { value: 'voided', label: '已作废', color: 'default' },
];

const shippingBearerOptions = [
    { value: 'self', label: '我方承担' },
    { value: 'merchant', label: '商家承担' },
    { value: 'shared', label: '双方平摊' },
];

const settlementTargetOptions = [
    { value: 'logistics_company', label: '物流公司' },
    { value: 'none', label: '无需付款' },
];

const relatedTypeOptions = [
    { value: 'purchase_order', label: '进货单' },
    { value: 'inbound_order', label: '入库单' },
    { value: 'purchase_return', label: '采购退货单' },
    { value: 'manual', label: '手工记录' },
];

const getRecordType = (type: string) =>
    recordTypeOptions.find((item) => item.value === type) || recordTypeOptions[2];

const getPaymentStatus = (status: string) =>
    paymentStatusOptions.find((item) => item.value === status) || paymentStatusOptions[0];

const syncRecordSelfAmount = (
    form: ReturnType<typeof Form.useForm>[0],
    bearer?: LogisticsRecord['shipping_fee_bearer'],
    shippingFeeValue?: number | string | null
) => {
    const rawShippingFee =
        shippingFeeValue === undefined ? form.getFieldValue('shipping_fee') : shippingFeeValue;
    const parsedShippingFee = Number(rawShippingFee || 0);
    const shippingFee = Number.isFinite(parsedShippingFee) ? parsedShippingFee : 0;
    const nextBearer =
        bearer ||
        (form.getFieldValue('shipping_fee_bearer') as LogisticsRecord['shipping_fee_bearer']) ||
        'self';

    if (nextBearer === 'self') {
        form.setFieldsValue({
            self_amount: shippingFee,
            settlement_target: 'logistics_company',
            payment_status: 'unpaid',
        });
    }
    if (nextBearer === 'merchant') {
        form.setFieldsValue({
            self_amount: 0,
            settlement_target: 'none',
            payment_status: 'paid',
        });
    }
    if (nextBearer === 'shared') {
        form.setFieldsValue({
            self_amount: Number((shippingFee / 2).toFixed(2)),
            settlement_target: 'logistics_company',
            payment_status: 'unpaid',
        });
    }
};

export default function LogisticsPage() {
    const [activeTab, setActiveTab] = useState<'companies' | 'records'>('companies');
    const [companyQuery, setCompanyQuery] = useState<{ search: string; status?: string }>({
        search: '',
        status: 'all',
    });
    const [recordQuery, setRecordQuery] = useState<{
        search: string;
        type?: string;
        company_id?: number;
        payment_status?: string;
        settlement_target?: string;
        date_from?: string;
        date_to?: string;
    }>({
        search: '',
    });
    const [companyVisible, setCompanyVisible] = useState(false);
    const [recordVisible, setRecordVisible] = useState(false);
    const [payVisible, setPayVisible] = useState(false);
    const [editingCompany, setEditingCompany] = useState<LogisticsCompany | null>(null);
    const [editingRecord, setEditingRecord] = useState<LogisticsRecord | null>(null);
    const [paymentTarget, setPaymentTarget] = useState<LogisticsRecord | null>(null);
    const [companyForm] = Form.useForm();
    const [recordForm] = Form.useForm();
    const [payForm] = Form.useForm();

    const {
        data: companies = [],
        loading: companiesLoading,
        refresh: refreshCompanies,
    } = useRequest(() => fetchLogisticsCompanies(companyQuery), {
        refreshDeps: [companyQuery],
        debounceWait: 300,
    });

    const {
        data: allCompanies = [],
        loading: allCompaniesLoading,
        refresh: refreshAllCompanies,
    } = useRequest(() => fetchLogisticsCompanies({ status: 'all' }));

    const {
        data: records = [],
        loading: recordsLoading,
        refresh: refreshRecords,
    } = useRequest(() => fetchLogisticsRecords(recordQuery), {
        refreshDeps: [recordQuery],
        debounceWait: 300,
    });

    const recordShippingBearer =
        (Form.useWatch('shipping_fee_bearer', recordForm) as
            | LogisticsRecord['shipping_fee_bearer']
            | undefined) || 'self';

    const payableAmount = useMemo(
        () => records.reduce((sum, item) => sum + Number(item.payable_amount || 0), 0),
        [records]
    );
    const activeCompanyCount = useMemo(
        () => allCompanies.filter((item) => item.status === 'active').length,
        [allCompanies]
    );

    const { runAsync: submitCompany, loading: savingCompany } = useRequest(
        async () => {
            const values = await companyForm.validateFields();
            await saveLogisticsCompany(values, editingCompany?.id);
        },
        {
            manual: true,
            onSuccess: () => {
                message.success(editingCompany ? '物流公司已更新' : '物流公司已创建');
                setCompanyVisible(false);
                setEditingCompany(null);
                companyForm.resetFields();
                refreshCompanies();
                refreshAllCompanies();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const { runAsync: stopCompany, loading: disablingCompany } = useRequest(
        disableLogisticsCompany,
        {
            manual: true,
            onSuccess: () => {
                message.success('物流公司已停用');
                refreshCompanies();
                refreshAllCompanies();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const { runAsync: submitRecord, loading: savingRecord } = useRequest(
        async () => {
            const values = await recordForm.validateFields();
            await saveLogisticsRecord(
                {
                    ...values,
                    occurred_at: values.occurred_at?.toISOString(),
                    paid_at: values.paid_at?.toISOString(),
                    company_id: values.company_id || null,
                    related_id: values.related_id || null,
                },
                editingRecord?.id
            );
        },
        {
            manual: true,
            onSuccess: () => {
                message.success(editingRecord ? '物流记录已更新' : '物流记录已创建');
                setRecordVisible(false);
                setEditingRecord(null);
                recordForm.resetFields();
                refreshRecords();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const { runAsync: submitPayment, loading: paying } = useRequest(
        async () => {
            if (!paymentTarget) return;
            const values = await payForm.validateFields();
            await payLogisticsRecord(paymentTarget.id, {
                paid_at: values.paid_at?.toISOString(),
                payment_account: values.payment_account || null,
                note: values.note || null,
            });
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('物流付款已登记');
                setPayVisible(false);
                setPaymentTarget(null);
                payForm.resetFields();
                refreshRecords();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const { runAsync: voidRecord, loading: voidingRecord } = useRequest(
        (id: number) => voidLogisticsRecord(id),
        {
            manual: true,
            onSuccess: () => {
                message.success('物流记录已作废');
                refreshRecords();
            },
            onError: (e) => message.error(e.message),
        }
    );

    const openCompanyModal = (company?: LogisticsCompany) => {
        setEditingCompany(company || null);
        if (company) {
            companyForm.setFieldsValue(company);
        } else {
            companyForm.resetFields();
            companyForm.setFieldsValue({ status: 'active' });
        }
        setCompanyVisible(true);
    };

    const openRecordModal = (record?: LogisticsRecord) => {
        setEditingRecord(record || null);
        if (record) {
            recordForm.setFieldsValue({
                ...record,
                occurred_at: dayjs(record.occurred_at),
                paid_at: record.paid_at ? dayjs(record.paid_at) : undefined,
            });
        } else {
            recordForm.resetFields();
            recordForm.setFieldsValue({
                type: 'manual',
                occurred_at: dayjs(),
                shipping_fee: 0,
                self_amount: 0,
                shipping_fee_bearer: 'self',
                settlement_target: 'logistics_company',
                payment_status: 'unpaid',
            });
        }
        setRecordVisible(true);
    };

    const openPayment = (record: LogisticsRecord) => {
        setPaymentTarget(record);
        payForm.resetFields();
        payForm.setFieldsValue({
            paid_at: dayjs(),
        });
        setPayVisible(true);
    };

    const companyColumns: ColumnsType<LogisticsCompany> = [
        {
            title: '物流公司',
            dataIndex: 'name',
            render: (text, record) => (
                <div>
                    <div className="font-bold text-gray-900 dark:text-gray-100">{text}</div>
                    <div className="text-xs text-gray-400">
                        {record.contact || '未填写联系方式'}
                    </div>
                </div>
            ),
        },
        {
            title: '状态',
            dataIndex: 'status',
            width: 100,
            render: (status) => (
                <Tag color={status === 'active' ? 'green' : 'default'}>
                    {status === 'active' ? '启用' : '停用'}
                </Tag>
            ),
        },
        {
            title: '备注',
            dataIndex: 'note',
            ellipsis: true,
            render: (text) => text || '-',
        },
        {
            title: '更新时间',
            dataIndex: 'updated_at',
            width: 180,
            render: (text) => formatDate(text),
        },
        {
            title: '操作',
            width: 150,
            align: 'center',
            render: (_, record) => (
                <div className="flex items-center justify-center gap-2">
                    <Tooltip title="编辑">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => openCompanyModal(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="确定停用该物流公司？"
                        okButtonProps={{ danger: true, loading: disablingCompany }}
                        onConfirm={() => stopCompany(record.id)}
                    >
                        <Tooltip title="停用">
                            <Button
                                type="text"
                                danger
                                disabled={record.status === 'disabled'}
                                icon={<DeleteOutlined />}
                            />
                        </Tooltip>
                    </Popconfirm>
                </div>
            ),
        },
    ];

    const recordColumns: ColumnsType<LogisticsRecord> = [
        {
            title: '物流信息',
            width: 260,
            render: (_, record) => {
                const typeConfig = getRecordType(record.type);
                return (
                    <div>
                        <div className="mb-1 flex items-center gap-2">
                            <Tag color={typeConfig.color}>{typeConfig.label}</Tag>
                            <span className="font-bold text-gray-900 dark:text-gray-100">
                                {record.company?.name || '未指定物流公司'}
                            </span>
                        </div>
                        <div className="font-mono text-xs text-gray-400">
                            {record.tracking_no || '无物流单号'}
                        </div>
                    </div>
                );
            },
        },
        {
            title: '费用',
            width: 220,
            render: (_, record) => (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                    <div>运费 {formatPrice(record.shipping_fee)}</div>
                    <div className="font-mono text-red-500">
                        我方承担 {formatPrice(record.self_amount)}
                    </div>
                    <div>
                        {record.settlement_target === 'logistics_company'
                            ? '结算给物流公司'
                            : '无需付款'}
                    </div>
                </div>
            ),
        },
        {
            title: '付款状态',
            width: 150,
            render: (_, record) => {
                const status = getPaymentStatus(record.payment_status);
                return (
                    <div>
                        <Tag color={status.color}>{status.label}</Tag>
                        {record.payment_status === 'unpaid' && record.payable_amount > 0 && (
                            <div className="mt-1 font-mono font-black text-red-500">
                                {formatPrice(record.payable_amount)}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            title: '关联业务',
            width: 160,
            render: (_, record) =>
                record.related_type && record.related_id ? (
                    <span className="font-mono text-gray-500">
                        {relatedTypeOptions.find((item) => item.value === record.related_type)
                            ?.label || record.related_type}
                        -{record.related_id}
                    </span>
                ) : (
                    <span className="text-gray-400">-</span>
                ),
        },
        {
            title: '发生时间',
            dataIndex: 'occurred_at',
            width: 180,
            render: (text) => formatDate(text),
        },
        {
            title: '备注',
            dataIndex: 'note',
            ellipsis: true,
            render: (text) => text || '-',
        },
        {
            title: '操作',
            width: 180,
            align: 'center',
            render: (_, record) => (
                <div className="flex items-center justify-center gap-2">
                    {record.payment_status === 'unpaid' && record.payable_amount > 0 && (
                        <Tooltip title="登记付款">
                            <Button
                                type="text"
                                icon={<CheckCircleOutlined />}
                                onClick={() => openPayment(record)}
                            />
                        </Tooltip>
                    )}
                    <Tooltip title="编辑">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => openRecordModal(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="确定作废该物流记录？"
                        okButtonProps={{ danger: true, loading: voidingRecord }}
                        onConfirm={() => voidRecord(record.id)}
                    >
                        <Tooltip title="作废">
                            <Button
                                type="text"
                                danger
                                disabled={record.payment_status === 'voided'}
                                icon={<DeleteOutlined />}
                            />
                        </Tooltip>
                    </Popconfirm>
                </div>
            ),
        },
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-black p-6 md:p-10 relative overflow-hidden">
            <div className="max-w-[1600px] mx-auto space-y-8 relative z-10">
                <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            <CarOutlined />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                                Warehouse
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100">
                            物流管理
                        </h1>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">
                            维护物流公司、物流单号、运费承担和物流待付款。
                        </p>
                    </div>
                    <Button
                        type="primary"
                        size="large"
                        icon={<PlusOutlined />}
                        onClick={() =>
                            activeTab === 'records' ? openRecordModal() : openCompanyModal()
                        }
                        className="h-12 rounded-xl border-none bg-blue-600 px-6 shadow-lg shadow-blue-600/20"
                    >
                        {activeTab === 'companies' ? '新增物流公司' : '新增物流记录'}
                    </Button>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <MetricCard
                        label="当前筛选物流待付款"
                        value={formatPrice(payableAmount)}
                        icon={<WalletOutlined />}
                        tone="red"
                    />
                    <MetricCard
                        label="当前筛选物流记录"
                        value={`${records.length} 条`}
                        icon={<CarOutlined />}
                    />
                    <MetricCard
                        label="启用物流公司"
                        value={`${activeCompanyCount} 家`}
                        icon={<CarOutlined />}
                        tone="green"
                    />
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-[#1f1f1f]">
                    <Tabs
                        activeKey={activeTab}
                        onChange={(key) => setActiveTab(key as 'records' | 'companies')}
                        items={[
                            {
                                key: 'companies',
                                label: `物流公司 ${companies.length}`,
                                children: (
                                    <div className="space-y-4">
                                        <CompanyFilters
                                            query={companyQuery}
                                            onChange={setCompanyQuery}
                                            onRefresh={refreshCompanies}
                                        />
                                        <Table
                                            rowKey="id"
                                            loading={companiesLoading}
                                            columns={companyColumns}
                                            dataSource={companies}
                                            pagination={{ pageSize: 10, showSizeChanger: true }}
                                        />
                                    </div>
                                ),
                            },
                            {
                                key: 'records',
                                label: `物流记录 ${records.length}`,
                                children: (
                                    <div className="space-y-4">
                                        <RecordFilters
                                            query={recordQuery}
                                            companies={allCompanies}
                                            onChange={setRecordQuery}
                                            onRefresh={refreshRecords}
                                        />
                                        <Table
                                            rowKey="id"
                                            loading={recordsLoading || allCompaniesLoading}
                                            columns={recordColumns}
                                            dataSource={records}
                                            pagination={{ pageSize: 10, showSizeChanger: true }}
                                            scroll={{ x: 1280 }}
                                        />
                                    </div>
                                ),
                            },
                        ]}
                    />
                </div>
            </div>

            <CompanyModal
                open={companyVisible}
                editingCompany={editingCompany}
                form={companyForm}
                loading={savingCompany}
                onCancel={() => setCompanyVisible(false)}
                onSubmit={submitCompany}
            />
            <RecordModal
                open={recordVisible}
                editingRecord={editingRecord}
                form={recordForm}
                companies={allCompanies}
                recordShippingBearer={recordShippingBearer}
                loading={savingRecord}
                onCancel={() => setRecordVisible(false)}
                onSubmit={submitRecord}
            />
            <PaymentModal
                open={payVisible}
                target={paymentTarget}
                form={payForm}
                loading={paying}
                onCancel={() => setPayVisible(false)}
                onSubmit={submitPayment}
            />
        </div>
    );
}

function CompanyFilters({
    query,
    onChange,
    onRefresh,
}: {
    query: { search: string; status?: string };
    onChange: React.Dispatch<React.SetStateAction<{ search: string; status?: string }>>;
    onRefresh: () => void;
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white bg-white/80 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#1f1f1f]/80">
            <div className="flex flex-1 flex-wrap items-center gap-3">
                <Input
                    allowClear
                    prefix={<SearchOutlined className="text-gray-400" />}
                    placeholder="搜索物流公司、联系方式或备注..."
                    value={query.search}
                    onChange={(e) => onChange((prev) => ({ ...prev, search: e.target.value }))}
                    className="h-10 max-w-md rounded-xl border-none bg-gray-100/60 dark:bg-[#141414]"
                />
                <Select
                    value={query.status}
                    onChange={(status) => onChange((prev) => ({ ...prev, status }))}
                    className="w-36"
                    options={[
                        { value: 'all', label: '全部状态' },
                        { value: 'active', label: '启用' },
                        { value: 'disabled', label: '停用' },
                    ]}
                />
            </div>
            <Button icon={<ReloadOutlined />} onClick={onRefresh} />
        </div>
    );
}

function RecordFilters({
    query,
    companies,
    onChange,
    onRefresh,
}: {
    query: {
        search: string;
        type?: string;
        company_id?: number;
        payment_status?: string;
        settlement_target?: string;
        date_from?: string;
        date_to?: string;
    };
    companies: LogisticsCompany[];
    onChange: React.Dispatch<
        React.SetStateAction<{
            search: string;
            type?: string;
            company_id?: number;
            payment_status?: string;
            settlement_target?: string;
            date_from?: string;
            date_to?: string;
        }>
    >;
    onRefresh: () => void;
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white bg-white/80 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#1f1f1f]/80">
            <div className="flex flex-1 flex-wrap items-center gap-3">
                <Input
                    allowClear
                    prefix={<SearchOutlined className="text-gray-400" />}
                    placeholder="搜索物流单号、公司、备注或关联单号..."
                    value={query.search}
                    onChange={(e) => onChange((prev) => ({ ...prev, search: e.target.value }))}
                    className="h-10 max-w-md rounded-xl border-none bg-gray-100/60 dark:bg-[#141414]"
                />
                <Select
                    allowClear
                    placeholder="物流类型"
                    value={query.type}
                    onChange={(type) => onChange((prev) => ({ ...prev, type }))}
                    className="w-36"
                    options={recordTypeOptions}
                />
                <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="物流公司"
                    value={query.company_id}
                    onChange={(company_id) => onChange((prev) => ({ ...prev, company_id }))}
                    className="w-44"
                    options={companies.map((item) => ({
                        value: item.id,
                        label: item.name,
                    }))}
                />
                <Select
                    allowClear
                    placeholder="付款状态"
                    value={query.payment_status}
                    onChange={(payment_status) => onChange((prev) => ({ ...prev, payment_status }))}
                    className="w-36"
                    options={paymentStatusOptions}
                />
                <DatePicker.RangePicker
                    className="h-10 rounded-xl"
                    onChange={(dates) =>
                        onChange((prev) => ({
                            ...prev,
                            date_from: dates?.[0]?.startOf('day').toISOString(),
                            date_to: dates?.[1]?.endOf('day').toISOString(),
                        }))
                    }
                />
            </div>
            <Button icon={<ReloadOutlined />} onClick={onRefresh} />
        </div>
    );
}

function CompanyModal({
    open,
    editingCompany,
    form,
    loading,
    onCancel,
    onSubmit,
}: {
    open: boolean;
    editingCompany: LogisticsCompany | null;
    form: ReturnType<typeof Form.useForm>[0];
    loading: boolean;
    onCancel: () => void;
    onSubmit: () => void;
}) {
    return (
        <Modal
            title={editingCompany ? '编辑物流公司' : '新增物流公司'}
            open={open}
            onCancel={onCancel}
            onOk={onSubmit}
            confirmLoading={loading}
            destroyOnHidden
            width={680}
        >
            <Form form={form} layout="vertical" className="pt-4">
                <Form.Item
                    name="name"
                    label="物流公司名称"
                    rules={[{ required: true, message: '请输入物流公司名称' }]}
                >
                    <Input placeholder="例如：顺丰、京东、德邦" />
                </Form.Item>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Form.Item name="contact" label="联系方式">
                        <Input placeholder="电话、微信或直营网点信息" />
                    </Form.Item>
                    <Form.Item
                        name="status"
                        label="状态"
                        rules={[{ required: true, message: '请选择状态' }]}
                    >
                        <Select
                            options={[
                                { value: 'active', label: '启用' },
                                { value: 'disabled', label: '停用' },
                            ]}
                        />
                    </Form.Item>
                </div>
                <Form.Item name="note" label="备注">
                    <Input.TextArea rows={3} placeholder="备注" />
                </Form.Item>
            </Form>
        </Modal>
    );
}

function RecordModal({
    open,
    editingRecord,
    form,
    companies,
    recordShippingBearer,
    loading,
    onCancel,
    onSubmit,
}: {
    open: boolean;
    editingRecord: LogisticsRecord | null;
    form: ReturnType<typeof Form.useForm>[0];
    companies: LogisticsCompany[];
    recordShippingBearer: LogisticsRecord['shipping_fee_bearer'];
    loading: boolean;
    onCancel: () => void;
    onSubmit: () => void;
}) {
    const paymentStatus =
        (Form.useWatch('payment_status', form) as LogisticsRecord['payment_status'] | undefined) ||
        'unpaid';

    return (
        <Modal
            title={editingRecord ? `编辑 WL-${editingRecord.id}` : '新增物流记录'}
            open={open}
            onCancel={onCancel}
            onOk={onSubmit}
            confirmLoading={loading}
            destroyOnHidden
            width={760}
        >
            <Form form={form} layout="vertical" className="pt-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Form.Item
                        name="type"
                        label="物流类型"
                        rules={[{ required: true, message: '请选择物流类型' }]}
                    >
                        <Select options={recordTypeOptions} />
                    </Form.Item>
                    <Form.Item
                        name="company_id"
                        label="物流公司"
                        rules={[
                            {
                                required: true,
                                message: '请选择物流公司',
                            },
                        ]}
                    >
                        <Select
                            showSearch
                            optionFilterProp="label"
                            placeholder="请选择物流公司"
                            options={companies.map((item) => ({
                                value: item.id,
                                label:
                                    item.status === 'disabled' ? `${item.name}（停用）` : item.name,
                                disabled: item.status === 'disabled',
                            }))}
                        />
                    </Form.Item>
                    <Form.Item name="tracking_no" label="物流单号">
                        <Input placeholder="可选" />
                    </Form.Item>
                    <Form.Item
                        name="occurred_at"
                        label="发生时间"
                        rules={[{ required: true, message: '请选择发生时间' }]}
                    >
                        <DatePicker showTime className="w-full" />
                    </Form.Item>
                    <Form.Item name="shipping_fee" label="运费金额">
                        <InputNumber
                            min={0}
                            precision={2}
                            prefix="¥"
                            className="w-full"
                            onChange={(value) => syncRecordSelfAmount(form, undefined, value)}
                        />
                    </Form.Item>
                    <Form.Item name="shipping_fee_bearer" label="运费承担方">
                        <Select
                            options={shippingBearerOptions}
                            onChange={(value) => syncRecordSelfAmount(form, value)}
                        />
                    </Form.Item>
                    <Form.Item name="self_amount" label="我方承担金额">
                        <InputNumber
                            min={0}
                            precision={2}
                            prefix="¥"
                            className="w-full"
                            disabled={recordShippingBearer !== 'shared'}
                        />
                    </Form.Item>
                    <Form.Item name="settlement_target" label="结算对象">
                        <Select options={settlementTargetOptions} />
                    </Form.Item>
                    <Form.Item name="payment_status" label="付款状态">
                        <Select options={paymentStatusOptions} />
                    </Form.Item>
                    {paymentStatus === 'paid' && (
                        <Form.Item name="paid_at" label="付款时间">
                            <DatePicker showTime className="w-full" />
                        </Form.Item>
                    )}
                    {paymentStatus === 'paid' && (
                        <Form.Item name="payment_account" label="付款账户">
                            <Input />
                        </Form.Item>
                    )}
                    <Form.Item name="related_type" label="关联业务">
                        <Select allowClear options={relatedTypeOptions} />
                    </Form.Item>
                    <Form.Item name="related_id" label="关联单据 ID">
                        <InputNumber min={1} precision={0} className="w-full" />
                    </Form.Item>
                </div>
                <Form.Item name="note" label="备注">
                    <Input.TextArea rows={3} />
                </Form.Item>
            </Form>
        </Modal>
    );
}

function PaymentModal({
    open,
    target,
    form,
    loading,
    onCancel,
    onSubmit,
}: {
    open: boolean;
    target: LogisticsRecord | null;
    form: ReturnType<typeof Form.useForm>[0];
    loading: boolean;
    onCancel: () => void;
    onSubmit: () => void;
}) {
    return (
        <Modal
            title={target ? `登记 WL-${target.id} 付款` : '登记物流付款'}
            open={open}
            onCancel={onCancel}
            onOk={onSubmit}
            confirmLoading={loading}
            destroyOnHidden
            width={620}
        >
            <Form form={form} layout="vertical" className="pt-4">
                {target && (
                    <div className="mb-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-black/20">
                        <div className="grid grid-cols-2 gap-3">
                            <ReadonlyCell
                                label="物流公司"
                                value={target.company?.name || '未指定物流公司'}
                            />
                            <ReadonlyCell
                                label="待付款"
                                value={formatPrice(target.payable_amount)}
                                strong
                            />
                        </div>
                    </div>
                )}
                <Form.Item
                    name="paid_at"
                    label="付款时间"
                    rules={[{ required: true, message: '请选择付款时间' }]}
                >
                    <DatePicker showTime className="w-full" />
                </Form.Item>
                <Form.Item name="payment_account" label="付款账户">
                    <Input />
                </Form.Item>
                <Form.Item name="note" label="备注">
                    <Input.TextArea rows={3} />
                </Form.Item>
            </Form>
        </Modal>
    );
}

function MetricCard({
    label,
    value,
    icon,
    tone = 'blue',
}: {
    label: string;
    value: string;
    icon: React.ReactNode;
    tone?: 'blue' | 'red' | 'green';
}) {
    const toneClass = {
        blue: 'text-blue-600 dark:text-blue-400',
        red: 'text-red-500',
        green: 'text-emerald-600 dark:text-emerald-400',
    }[tone];

    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-[#1f1f1f]">
            <div className="mb-3 flex items-center gap-2 text-sm text-gray-400">
                {icon}
                <span>{label}</span>
            </div>
            <div className={`font-mono text-3xl font-black ${toneClass}`}>{value}</div>
        </div>
    );
}

function ReadonlyCell({
    label,
    value,
    strong,
}: {
    label: string;
    value: React.ReactNode;
    strong?: boolean;
}) {
    return (
        <div>
            <div className="text-xs text-gray-400">{label}</div>
            <div
                className={
                    strong
                        ? 'font-mono text-lg font-black text-red-500'
                        : 'font-medium text-gray-900 dark:text-gray-100'
                }
            >
                {value}
            </div>
        </div>
    );
}
