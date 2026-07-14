import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { PurchaseSupplierInfoCard } from '../PurchaseSupplierInfoCard';
import type { PurchaseSupplier } from '../../types';

const supplier: PurchaseSupplier = {
  id: 'supplier-1',
  name: '原供应商全称',
  shortName: '原简称',
  code: 'PS-001',
  address: '上海市',
  contacts: [{ id: 'contact-1', name: '张三', isPrimary: true }],
  data: {
    supplyScope: '阀门',
    supplierType: '生产商',
    paymentTerms: '月结 30 天',
    defaultCurrency: 'CNY',
    remark: '优先供应商',
  },
  status: 'active',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

describe('PurchaseSupplierInfoCard', () => {
  it('基本信息和采购设置使用桌面双栏容器，联系人保持在容器下方独占整行', () => {
    render(
      <PurchaseSupplierInfoCard
        supplier={supplier}
        canWrite={false}
        onSaveField={jest.fn()}
        onArchive={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    const basicSection = screen.getByRole('heading', { name: '基本信息' }).parentElement;
    const settingsSection = screen.getByRole('heading', { name: '采购设置' }).parentElement;
    const groupsContainer = basicSection?.parentElement;
    const contactsHeading = screen.getByRole('heading', { name: '联系人' });

    expect(groupsContainer).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'md:divide-x');
    expect(groupsContainer).toContainElement(settingsSection);
    expect(groupsContainer).not.toContainElement(contactsHeading);
    expect(contactsHeading.parentElement?.parentElement).toHaveClass('border-t');
  });

  it('采购设置按指定字段两两并排，备注独占整行，基本信息仍逐项独占整行', () => {
    render(
      <PurchaseSupplierInfoCard
        supplier={supplier}
        canWrite={false}
        onSaveField={jest.fn()}
        onArchive={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    const basicSection = screen.getByRole('heading', { name: '基本信息' }).parentElement;
    const settingsSection = screen.getByRole('heading', { name: '采购设置' }).parentElement;
    const basicFields = within(basicSection as HTMLElement);
    const settingFields = within(settingsSection as HTMLElement);

    expect(basicSection?.querySelector('dl')).toHaveClass('grid-cols-2', 'gap-x-4');
    ['供应商全称', '简称', '供应商编码', '地址'].forEach((label) => {
      expect(basicFields.getByText(label).parentElement).toHaveClass('col-span-2');
    });

    expect(settingsSection?.querySelector('dl')).toHaveClass('grid-cols-2', 'gap-x-4');
    ['供应产品 / 业务范围', '供应商类型', '默认付款条件', '默认币种'].forEach((label) => {
      expect(settingFields.getByText(label).parentElement).not.toHaveClass('col-span-2');
    });
    expect(settingFields.getByText('备注').parentElement).toHaveClass('col-span-2');
  });

  it('供应产品与供应商类型并排后，供应产品编辑控件仍为多行 textarea', () => {
    render(
      <PurchaseSupplierInfoCard
        supplier={supplier}
        canWrite
        onSaveField={jest.fn()}
        onArchive={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '编辑供应产品 / 业务范围' }));

    const editor = screen.getByRole('textbox', { name: '供应产品 / 业务范围' });
    expect(editor.tagName).toBe('TEXTAREA');
    expect(editor).toHaveAttribute('rows', '3');
  });

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
