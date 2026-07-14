import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PurchaseSupplierInfoCard } from '../PurchaseSupplierInfoCard';
import type { PurchaseSupplier } from '../../types';

const supplier: PurchaseSupplier = {
  id: 'supplier-1',
  name: '原供应商全称',
  shortName: '原简称',
  code: 'PS-001',
  address: '上海市',
  contacts: [{ id: 'contact-1', name: '张三', isPrimary: true }],
  data: { supplyScope: '阀门', paymentTerms: '月结 30 天' },
  status: 'active',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

describe('PurchaseSupplierInfoCard', () => {
  it('可写模式显示并触发彼此独立的归档和永久删除按钮', () => {
    const onArchive = jest.fn();
    const onDelete = jest.fn();
    render(
      <PurchaseSupplierInfoCard
        supplier={supplier}
        canWrite
        onSaveField={jest.fn()}
        onArchive={onArchive}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '归档供应商' }));
    fireEvent.click(screen.getByRole('button', { name: '永久删除供应商' }));

    expect(onArchive).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('单字段保存失败时保留原资料，并不影响其它字段展示', async () => {
    const onSaveField = jest.fn().mockResolvedValue(false);
    render(
      <PurchaseSupplierInfoCard
        supplier={supplier}
        canWrite
        onSaveField={onSaveField}
        onArchive={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '编辑供应商全称' }));
    fireEvent.change(screen.getByRole('textbox', { name: '供应商全称' }), {
      target: { value: '错误的新名称' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存供应商全称' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('原资料未改变'));
    expect(onSaveField).toHaveBeenCalledWith({ name: '错误的新名称' });
    expect(screen.getByRole('heading', { name: '原简称' })).toBeInTheDocument();
    expect(screen.getByText('阀门')).toBeInTheDocument();
    expect(screen.getByText('月结 30 天')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(screen.getByText('原供应商全称')).toBeInTheDocument();
  });

  it('只读模式不渲染编辑、保存或联系人增删控件', () => {
    render(
      <PurchaseSupplierInfoCard
        supplier={supplier}
        canWrite={false}
        onSaveField={jest.fn()}
        onArchive={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getByText('只读')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /编辑/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /保存/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /删除联系人/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '归档供应商' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '永久删除供应商' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
