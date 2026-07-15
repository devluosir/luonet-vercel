import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { fetchPurchaseSuppliers } from '../../services/purchaseSupplierService';
import { PurchaseSupplierPage } from '../PurchaseSupplierPage';

const mockPush = jest.fn();
const mockShowToast = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('../../hooks/usePurchaseSupplierAccess', () => ({
  usePurchaseSupplierAccess: () => ({
    ready: true,
    canRead: true,
    canWrite: true,
    userId: 'user-1',
  }),
}));

jest.mock('../../services/purchaseSupplierService', () => ({
  fetchPurchaseSuppliers: jest.fn(),
  savePurchaseSupplier: jest.fn(),
  getPrimaryPurchaseSupplierContact: (supplier: { contacts: Array<{ isPrimary?: boolean }> }) => (
    supplier.contacts.find((contact) => contact.isPrimary) ?? supplier.contacts[0]
  ),
}));

jest.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

jest.mock('@/components/layout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/hooks/useAppUser', () => ({
  useAppUser: () => ({ user: { name: '测试用户' }, handleLogout: jest.fn() }),
}));

jest.mock('../../components/PurchaseSupplierFormModal', () => ({
  PurchaseSupplierFormModal: () => <div>新增弹窗</div>,
}));

describe('PurchaseSupplierPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(fetchPurchaseSuppliers).mockResolvedValue({
      isStale: false,
      items: [{
        id: 'supplier-1',
        name: '测试供应商有限公司',
        shortName: '测试供应商',
        code: 'SHOULD-NOT-SHOW',
        address: '',
        contacts: [{ id: 'contact-1', name: '张三', phone: '13800000000', isPrimary: true }],
        data: { supplyScope: '阀门与备件' },
        status: 'active',
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      }],
    });
  });

  it('全称与简称上下堆叠，并只保留供应商、主联系人、供货范围三列', async () => {
    render(<PurchaseSupplierPage />);

    await waitFor(() => expect(screen.getByText('阀门与备件')).toBeInTheDocument());
    expect(screen.getByText('供应商')).toBeInTheDocument();
    expect(screen.queryByText('简称')).not.toBeInTheDocument();
    expect(screen.getByText('主联系人')).toBeInTheDocument();
    expect(screen.getByText('供货范围')).toBeInTheDocument();
    expect(screen.queryByText('电话')).not.toBeInTheDocument();
    expect(screen.queryByText('SHOULD-NOT-SHOW')).not.toBeInTheDocument();
    expect(screen.getByText('测试供应商有限公司')).toHaveClass('font-semibold');
    expect(screen.getByText('测试供应商')).toHaveClass('text-xs');
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.queryByText('采购侧独立主数据，不与销售侧客户管理中的供应商混用。')).not.toBeInTheDocument();
    expect(screen.getByText('张三').parentElement).toHaveClass('flex', 'justify-between', 'md:contents');
    expect(screen.getByText('张三').parentElement).toContainElement(screen.getByText('阀门与备件'));
    expect(screen.getByRole('button', { name: '新增采购供应商' })).toHaveClass('shrink-0');

    fireEvent.click(screen.getByRole('link', { name: '查看采购供应商 测试供应商' }));
    expect(mockPush).toHaveBeenCalledWith('/purchase-supplier/detail?id=supplier-1');
  });

  it('列表不显示归档入口', async () => {
    render(<PurchaseSupplierPage />);

    await waitFor(() => expect(screen.getByText('测试供应商有限公司')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: '归档 测试供应商' })).not.toBeInTheDocument();
  });
});
