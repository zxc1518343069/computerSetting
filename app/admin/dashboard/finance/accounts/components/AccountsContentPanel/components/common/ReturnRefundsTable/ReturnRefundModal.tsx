import { formatPrice } from '@/utils';
import { DatePicker, Form, Input, InputNumber, Modal } from 'antd';
import type { FormInstance } from 'antd/es/form';
import { ReadonlyCell } from '../ReadonlyCell';
import type { ReturnRefund } from '../../../../../types';

interface ReturnRefundModalProps {
    target: ReturnRefund | null;
    form: FormInstance;
    loading: boolean;
    submit: () => Promise<void>;
    close: () => void;
}

export function ReturnRefundModal({
    target,
    form,
    loading,
    submit,
    close,
}: ReturnRefundModalProps) {
    return (
        <Modal
            title={target ? `登记 TH-${target.id} 收款` : '登记退货收款'}
            open={Boolean(target)}
            onCancel={close}
            onOk={submit}
            confirmLoading={loading}
            destroyOnHidden
            width={620}
        >
            <Form form={form} layout="vertical" className="pt-4">
                {target && (
                    <div className="mb-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-black/20">
                        <div className="grid grid-cols-2 gap-3">
                            <ReadonlyCell
                                label="应收退款"
                                value={formatPrice(target.receivable_amount)}
                                strong
                            />
                            <ReadonlyCell
                                label="已收退款"
                                value={formatPrice(target.refunded_amount)}
                            />
                            <ReadonlyCell
                                label="待退款"
                                value={formatPrice(target.pending_refund)}
                                strong
                            />
                        </div>
                    </div>
                )}
                <Form.Item
                    name="amount"
                    label="本次收款金额"
                    rules={[{ required: true, message: '请输入本次收款金额' }]}
                >
                    <InputNumber
                        min={0.01}
                        max={target?.pending_refund}
                        precision={2}
                        prefix="¥"
                        className="w-full"
                    />
                </Form.Item>
                <Form.Item name="refund_account" label="收款账号">
                    <Input />
                </Form.Item>
                <Form.Item
                    name="refunded_at"
                    label="收款时间"
                    rules={[{ required: true, message: '请选择收款时间' }]}
                >
                    <DatePicker showTime className="w-full" />
                </Form.Item>
                <Form.Item name="note" label="备注">
                    <Input.TextArea rows={3} />
                </Form.Item>
            </Form>
        </Modal>
    );
}
